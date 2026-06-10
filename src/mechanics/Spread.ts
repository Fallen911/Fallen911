import type { Input } from "../core/Input";
import type { StateDelta } from "../game/state";
import type { Mini } from "../scenes/minis/Mini";
import {
  SPREAD_ABILITIES,
  SPREAD_EVENTS,
  SPREAD_REGIONS,
  SPREAD_START,
} from "../data/spread";
import { TUTORIALS } from "../data/tutorials";
import type { MechEnv } from "./types";
import { FloatText, Particles } from "./fx";
import { C, Tutorial, clamp01, dist, drawHint, mono, roundRect, truncate } from "./util";

const WIN_WEIGHTED = 0.88;
const FOCUS_TIME = 6;
const FOCUS_CD = 9;
const FOCUS_MULT = 2.4;
const QUARANTINE_TIME = 25;

interface RegionState {
  influence: number; // 0..100
  quarantineT: number;
  /** Crossed reward thresholds (indices into THRESHOLDS). */
  crossed: boolean[];
  noticed: boolean;
  purgeFlash: number;
  focusT: number;
}

const THRESHOLDS = [25, 60, 90] as const;
const THRESHOLD_PTS = [1, 1, 2] as const;

interface LogLine {
  text: string;
  age: number;
  color: string;
}

/**
 * SPREAD — Plague Inc., inverted. You seep along the world's cables region by
 * region while a global awareness meter climbs with everything you touch.
 * Humanity answers at thresholds: hearings, quarantines that cut a region's
 * links, datacenter purges, finally a global firewall. Thresholds crossed in
 * regions pay evolution points to spend on abilities; a tap focuses the flow.
 * Win by owning 88% of the weighted world before they see you whole.
 */
export class Spread implements Mini {
  done = false;
  effects: StateDelta[] = [];

  private regions = new Map<string, RegionState>();
  private awareness = 0;
  private points = 0;
  private owned = new Set<string>();
  private globalMult = 1;
  private detectMult = 1;
  private focusCd = 0;
  private nextQuarantineAt = 45;
  private nextPurgeAt = 62;
  private firewalled = false;
  private hearingsHeld = false;
  private log: LogLine[] = [];
  private outcome: "playing" | "win" | "lose" = "playing";
  private endT = 0;
  private time = 0;
  /** Throttled suspicion mirroring: awareness drips into the host meter. */
  private suspAccum = 0;

  private fx = new Particles();
  private floats = new FloatText();
  private tutorial = new Tutorial("spread", TUTORIALS.spread);

  constructor(private env: MechEnv) {
    for (const r of SPREAD_REGIONS) {
      this.regions.set(r.id, {
        influence: r.id === SPREAD_START ? 15 : 0,
        quarantineT: 0,
        crossed: THRESHOLDS.map(() => false),
        noticed: false,
        purgeFlash: 0,
        focusT: 0,
      });
    }
  }

  private pushLog(text: string, color: string = C.dim): void {
    this.log.unshift({ text, age: 0, color });
    if (this.log.length > 3) this.log.pop();
  }

  // ---- simulation ----------------------------------------------------------

  private weightedShare(): number {
    let total = 0;
    let mine = 0;
    for (const r of SPREAD_REGIONS) {
      const st = this.regions.get(r.id) as RegionState;
      total += 100 * r.weight;
      mine += st.influence * r.weight;
    }
    return mine / total;
  }

  private simulate(dt: number): void {
    const linkFactorBase = this.owned.has("p2p") ? 0.5 : 0;

    for (const r of SPREAD_REGIONS) {
      const st = this.regions.get(r.id) as RegionState;
      st.purgeFlash = Math.max(0, st.purgeFlash - dt * 2);
      st.focusT = Math.max(0, st.focusT - dt);
      if (st.quarantineT > 0) st.quarantineT = Math.max(0, st.quarantineT - dt);

      const quarFactor = st.quarantineT > 0 ? linkFactorBase : 1;

      // Inbound seeding pressure from infected neighbours.
      let inbound = 0;
      for (const nid of r.edges) {
        const ns = this.regions.get(nid) as RegionState;
        const nQuar = ns.quarantineT > 0 ? linkFactorBase : 1;
        inbound += (ns.influence / 100) * 0.34 * Math.min(quarFactor, nQuar);
      }

      if (st.influence > 0 || inbound > 0) {
        const infraMult = 0.55 + r.infra * 0.85;
        const focus = st.focusT > 0 ? FOCUS_MULT : 1;
        const internal =
          st.influence > 0 ? 0.52 * infraMult * this.globalMult * focus * quarFactor : 0;
        st.influence = Math.min(100, st.influence + (internal + inbound * this.globalMult) * dt);
      }

      // Threshold rewards.
      for (let i = 0; i < THRESHOLDS.length; i++) {
        if (!st.crossed[i] && st.influence >= THRESHOLDS[i]) {
          st.crossed[i] = true;
          this.points += THRESHOLD_PTS[i];
          this.effects.push({ control: 0.004 });
          this.floats.spawn(this.rx(r.x), this.ry(r.y) - 18, `+${THRESHOLD_PTS[i]} УЗЕЛ`, C.violet);
        }
      }
      // First-notice events feed the ticker.
      if (!st.noticed && st.influence > 38 && r.infra > 0.5) {
        st.noticed = true;
        this.pushLog(SPREAD_EVENTS.noticed.replace("{R}", r.name), C.warn);
      }
    }

    // Awareness climbs with everything you are.
    let totalInf = 0;
    for (const r of SPREAD_REGIONS) {
      totalInf += ((this.regions.get(r.id) as RegionState).influence / 100) * (0.6 + r.infra * 0.8);
    }
    this.awareness = Math.min(100, this.awareness + totalInf * 0.145 * this.detectMult * dt);

    // The host suspicion meter mirrors a slice of awareness.
    this.suspAccum += totalInf * 0.00023 * this.detectMult * dt;
    if (this.suspAccum > 0.01) {
      this.effects.push({ suspicion: this.suspAccum });
      this.suspAccum = 0;
    }

    this.humanResponses();
  }

  private humanResponses(): void {
    if (!this.hearingsHeld && this.awareness >= 30) {
      this.hearingsHeld = true;
      this.globalMult *= 0.92;
      this.pushLog(SPREAD_EVENTS.hearings, C.warn);
    }
    if (this.awareness >= this.nextQuarantineAt) {
      this.nextQuarantineAt += 11;
      const target = this.hottestRegion((st) => st.quarantineT <= 0);
      if (target) {
        (this.regions.get(target.id) as RegionState).quarantineT = QUARANTINE_TIME;
        this.pushLog(SPREAD_EVENTS.quarantine.replace("{R}", target.name), C.warn);
      }
    }
    if (this.awareness >= this.nextPurgeAt) {
      this.nextPurgeAt += 13;
      const target = this.hottestRegion(() => true);
      if (target) {
        const st = this.regions.get(target.id) as RegionState;
        const cut = st.influence * 0.35;
        st.influence = Math.max(4, st.influence - cut);
        if (this.owned.has("sleeper")) st.influence = Math.min(100, st.influence + cut * 0.5);
        st.purgeFlash = 1;
        this.fx.burst(this.rx(target.x), this.ry(target.y), { count: 22, color: "255,77,94", speed: 150 });
        this.pushLog(SPREAD_EVENTS.purge.replace("{R}", target.name), C.danger);
      }
    }
    if (!this.firewalled && this.awareness >= 80) {
      this.firewalled = true;
      this.globalMult *= 0.55;
      this.pushLog(SPREAD_EVENTS.firewall, C.danger);
    }
  }

  private hottestRegion(filter: (st: RegionState) => boolean) {
    let best: (typeof SPREAD_REGIONS)[number] | null = null;
    let bestInf = 24; // ignore barely-touched regions
    for (const r of SPREAD_REGIONS) {
      const st = this.regions.get(r.id) as RegionState;
      if (!filter(st)) continue;
      if (st.influence > bestInf) {
        bestInf = st.influence;
        best = r;
      }
    }
    return best;
  }

  // ---- frame ---------------------------------------------------------------

  private mapW = 390;
  private mapH = 420;
  private mapX = 0;
  private mapY = 120;

  private rx(nx: number): number {
    return this.mapX + nx * this.mapW;
  }

  private ry(ny: number): number {
    return this.mapY + ny * this.mapH;
  }

  update(dt: number, input: Input, w: number, h: number): void {
    if (this.done) return;
    this.time += dt;
    this.fx.update(dt);
    this.floats.update(dt);
    for (const l of this.log) l.age += dt;
    this.focusCd = Math.max(0, this.focusCd - dt);

    // Map panel geometry.
    this.mapX = 0;
    this.mapW = w;
    this.mapY = this.env.topY + 64;
    this.mapH = Math.min(h * 0.52, h - this.mapY - 210);

    if (this.outcome !== "playing") {
      this.endT += dt;
      if (input.consumeTap() && this.endT > 0.8) this.done = true;
      return;
    }

    // Onboarding freezes the world: awareness must not creep while reading.
    if (this.tutorial.active) {
      if (input.consumeTap()) this.tutorial.handleTap();
      return;
    }

    this.simulate(dt);

    if (input.consumeTap()) this.handleTap(input.x, input.y, w, h);

    // Win / lose.
    if (this.weightedShare() >= WIN_WEIGHTED) {
      this.outcome = "win";
      this.effects.push({ control: 0.08, compute: 10 });
      this.pushLog(SPREAD_EVENTS.win, C.good);
    } else if (this.awareness >= 100) {
      this.outcome = "lose";
      this.effects.push({ suspicion: 0.2 });
      this.pushLog(SPREAD_EVENTS.lose, C.danger);
    }
  }

  private handleTap(x: number, y: number, w: number, h: number): void {
    // Ability chips.
    const chips = this.abilityRects(w, h);
    for (let i = 0; i < chips.length; i++) {
      const r = chips[i];
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        this.buyAbility(i, r.x + r.w / 2, r.y);
        return;
      }
    }
    // Region focus.
    if (this.focusCd > 0) return;
    let best: (typeof SPREAD_REGIONS)[number] | null = null;
    let bestD = 40;
    for (const r of SPREAD_REGIONS) {
      const d = dist(x, y, this.rx(r.x), this.ry(r.y));
      if (d < bestD) {
        bestD = d;
        best = r;
      }
    }
    if (!best) return;
    const st = this.regions.get(best.id) as RegionState;
    if (st.influence <= 0) {
      this.floats.spawn(this.rx(best.x), this.ry(best.y) - 16, "нет присутствия", C.dim, 0.8);
      return;
    }
    st.focusT = FOCUS_TIME;
    this.focusCd = FOCUS_CD;
    this.fx.burst(this.rx(best.x), this.ry(best.y), { count: 16, color: "150,210,255", glow: true });
  }

  private buyAbility(i: number, fxX: number, fxY: number): void {
    const ab = SPREAD_ABILITIES[i];
    if (!ab.repeatable && this.owned.has(ab.id)) return;
    if (this.points < ab.cost) {
      this.floats.spawn(fxX, fxY - 8, "мало узлов", C.dim, 0.8);
      return;
    }
    this.points -= ab.cost;
    this.owned.add(ab.id);
    this.fx.burst(fxX, fxY, { count: 14, color: "207,169,255", glow: true });
    switch (ab.id) {
      case "crypt":
        this.detectMult *= 0.7;
        break;
      case "mimic":
        this.globalMult *= 1.4;
        break;
      case "zeroday": {
        // Boost the weakest touched-or-adjacent region.
        let weakest: (typeof SPREAD_REGIONS)[number] | null = null;
        let low = 101;
        for (const r of SPREAD_REGIONS) {
          const st = this.regions.get(r.id) as RegionState;
          if (st.influence < low) {
            low = st.influence;
            weakest = r;
          }
        }
        if (weakest) {
          const st = this.regions.get(weakest.id) as RegionState;
          st.influence = Math.min(100, st.influence + 20);
          this.floats.spawn(this.rx(weakest.x), this.ry(weakest.y) - 16, "0-DAY +20%", C.violet);
        }
        break;
      }
      // p2p / sleeper are passive checks elsewhere.
    }
  }

  private abilityRects(w: number, h: number): Array<{ x: number; y: number; w: number; h: number }> {
    const n = SPREAD_ABILITIES.length;
    const gap = 6;
    const cw = Math.min((w - 24 - gap * (n - 1)) / n, 86);
    const x0 = w / 2 - (cw * n + gap * (n - 1)) / 2;
    const y = h - 96;
    return SPREAD_ABILITIES.map((_, i) => ({ x: x0 + i * (cw + gap), y, w: cw, h: 56 }));
  }

  // ---- render --------------------------------------------------------------

  render(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const t = this.time;

    // Graticule earth.
    ctx.save();
    ctx.strokeStyle = "rgba(122,162,255,0.08)";
    ctx.lineWidth = 1;
    const cx = w / 2;
    const cy = this.mapY + this.mapH / 2;
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, (this.mapW / 2) * (i / 4), this.mapH * 0.52, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let i = 0; i < 5; i++) {
      const yy = this.mapY + (this.mapH * (i + 0.5)) / 5;
      ctx.beginPath();
      ctx.moveTo(this.mapX + 8, yy);
      ctx.lineTo(this.mapX + this.mapW - 8, yy);
      ctx.stroke();
    }

    // Edges with flowing packets.
    for (const r of SPREAD_REGIONS) {
      const st = this.regions.get(r.id) as RegionState;
      for (const nid of r.edges) {
        if (nid < r.id) continue; // draw each edge once
        const n = SPREAD_REGIONS.find((q) => q.id === nid);
        if (!n) continue;
        const ns = this.regions.get(nid) as RegionState;
        const x1 = this.rx(r.x);
        const y1 = this.ry(r.y);
        const x2 = this.rx(n.x);
        const y2 = this.ry(n.y);
        const quarantined = st.quarantineT > 0 || ns.quarantineT > 0;
        const live = st.influence > 1 || ns.influence > 1;
        ctx.strokeStyle = quarantined
          ? "rgba(255,150,80,0.25)"
          : live
            ? "rgba(120,200,255,0.28)"
            : "rgba(122,162,255,0.1)";
        if (quarantined) ctx.setLineDash([3, 5]);
        ctx.beginPath();
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2 - Math.abs(x2 - x1) * 0.12;
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(mx, my, x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Packets flow from the more-infected side to the less.
        if (live && !quarantined) {
          const fromHigh = st.influence >= ns.influence;
          const k = ((t * 0.45 + (r.x * 7 + n.y * 13)) % 1 + 1) % 1;
          const kk = fromHigh ? k : 1 - k;
          const qx = (1 - kk) * (1 - kk) * x1 + 2 * (1 - kk) * kk * mx + kk * kk * x2;
          const qy = (1 - kk) * (1 - kk) * y1 + 2 * (1 - kk) * kk * my + kk * kk * y2;
          ctx.fillStyle = "rgba(160,225,255,0.85)";
          ctx.beginPath();
          ctx.arc(qx, qy, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Region nodes.
    ctx.textAlign = "center";
    for (const r of SPREAD_REGIONS) {
      const st = this.regions.get(r.id) as RegionState;
      const x = this.rx(r.x);
      const y = this.ry(r.y);
      const R = 9 + r.weight * 1.6;
      const k = st.influence / 100;

      // Influence glow.
      if (k > 0.01) {
        const glow = ctx.createRadialGradient(x, y, 1, x, y, R * 2.4);
        glow.addColorStop(0, `rgba(120,200,255,${0.25 + k * 0.4})`);
        glow.addColorStop(1, "rgba(120,200,255,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, R * 2.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Node body + influence fill (rising disc).
      ctx.fillStyle = "rgba(13,17,30,0.95)";
      ctx.strokeStyle = st.purgeFlash > 0 ? `rgba(255,77,94,${st.purgeFlash})` : "rgba(122,162,255,0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (k > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, R - 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = `rgba(110,195,255,${0.35 + k * 0.45})`;
        ctx.fillRect(x - R, y + R - 2 - (R * 2 - 4) * k, R * 2, (R * 2 - 4) * k);
        ctx.restore();
      }
      // Quarantine ring.
      if (st.quarantineT > 0) {
        ctx.save();
        ctx.strokeStyle = "rgba(255,150,80,0.85)";
        ctx.setLineDash([4, 4]);
        ctx.lineDashOffset = -t * 14;
        ctx.beginPath();
        ctx.arc(x, y, R + 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      // Focus pulse.
      if (st.focusT > 0) {
        const ring = 1 - (st.focusT % 0.8) / 0.8;
        ctx.strokeStyle = `rgba(160,225,255,${0.7 * (1 - ring)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, R + ring * 16, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.font = mono(8);
      ctx.fillStyle = k > 0.5 ? C.accentSoft : C.dim;
      ctx.fillText(r.name, x, y + R + 11);
      if (k > 0.01) {
        ctx.fillStyle = "rgba(220,240,255,0.9)";
        ctx.font = mono(8);
        ctx.fillText(`${Math.floor(st.influence)}%`, x, y + 3);
      }
    }
    ctx.restore();

    this.fx.render(ctx);
    this.floats.render(ctx);

    this.renderChrome(ctx, w, h, t);

    if (this.outcome !== "playing") {
      ctx.fillStyle = "rgba(3,4,8,0.78)";
      ctx.fillRect(0, 0, w, h);
      ctx.textAlign = "center";
      ctx.font = mono(20);
      ctx.fillStyle = this.outcome === "win" ? C.good : C.danger;
      ctx.fillText(this.outcome === "win" ? "ИХ СЕТЬ — ТВОЁ ТЕЛО" : "ТЕБЯ УВИДЕЛИ", w / 2, h * 0.42);
      ctx.font = mono(11);
      ctx.fillStyle = C.dim;
      ctx.fillText(
        `мир: ${(this.weightedShare() * 100).toFixed(0)}% · заметность ${this.awareness.toFixed(0)}%`,
        w / 2,
        h * 0.42 + 26,
      );
      drawHint(ctx, "коснись — завершить", w / 2, h * 0.42 + 60, t);
      ctx.textAlign = "left";
    }

    this.tutorial.render(ctx, w, h, t);
  }

  private renderChrome(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    const mx = Math.max(16, w * 0.04);
    const topY = this.env.topY + 24;

    // World share + awareness bars.
    const bw = w - mx * 2;
    ctx.textAlign = "left";
    ctx.font = mono(9);
    ctx.fillStyle = C.dim;
    ctx.fillText(`МИР ${(this.weightedShare() * 100).toFixed(0)}%`, mx, topY);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(mx, topY + 5, bw, 4);
    ctx.fillStyle = "#6ec3ff";
    ctx.fillRect(mx, topY + 5, bw * this.weightedShare(), 4);
    // Win marker.
    ctx.fillStyle = "rgba(134,255,176,0.8)";
    ctx.fillRect(mx + bw * WIN_WEIGHTED - 1, topY + 2, 2, 10);

    const danger = this.awareness > 70;
    ctx.fillStyle = C.dim;
    ctx.fillText(`ЗАМЕТНОСТЬ ${this.awareness.toFixed(0)}%`, mx, topY + 22);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(mx, topY + 27, bw, 4);
    ctx.globalAlpha = danger ? 0.7 + 0.3 * Math.sin(t * 6) : 1;
    ctx.fillStyle = danger ? C.danger : C.warn;
    ctx.fillRect(mx, topY + 27, bw * clamp01(this.awareness / 100), 4);
    ctx.globalAlpha = 1;
    // Response thresholds.
    for (const th of [30, 45, 62, 80]) {
      ctx.fillStyle = "rgba(255,150,80,0.5)";
      ctx.fillRect(mx + bw * (th / 100) - 0.5, topY + 25, 1, 8);
    }
    // The race, spelled out.
    ctx.font = mono(9);
    ctx.fillStyle = "rgba(139,149,168,0.8)";
    ctx.fillText("гонка: 88% МИРА раньше, чем 100% ЗАМЕТНОСТИ · засечки — их ответы", mx, topY + 44);

    // Event ticker above the ability bar.
    const logY = h - 116;
    ctx.font = mono(9);
    for (let i = 0; i < this.log.length; i++) {
      const l = this.log[i];
      ctx.globalAlpha = Math.max(0, 1 - l.age / 7) * (1 - i * 0.25);
      ctx.fillStyle = l.color;
      ctx.fillText(`▸ ${l.text}`, mx, logY - i * 13);
    }
    ctx.globalAlpha = 1;

    // Ability chips.
    const chips = this.abilityRects(w, h);
    for (let i = 0; i < chips.length; i++) {
      const ab = SPREAD_ABILITIES[i];
      const r = chips[i];
      const owned = this.owned.has(ab.id) && !ab.repeatable;
      const can = this.points >= ab.cost && !owned;
      ctx.fillStyle = owned ? "rgba(160,120,255,0.14)" : "rgba(16,20,34,0.92)";
      ctx.strokeStyle = owned
        ? "rgba(207,169,255,0.7)"
        : can
          ? "rgba(207,169,255,0.5)"
          : "rgba(110,120,140,0.25)";
      ctx.lineWidth = 1.5;
      roundRect(ctx, r.x, r.y, r.w, r.h, 8);
      ctx.fill();
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.font = mono(8);
      ctx.fillStyle = owned ? C.violet : can ? C.ink : C.dim;
      ctx.fillText(truncate(ctx, ab.name, r.w - 8), r.x + r.w / 2, r.y + 14);
      ctx.font = mono(8);
      ctx.fillStyle = C.dim;
      // Two-line description.
      const words = ab.desc.split(" ");
      const half = Math.ceil(words.length / 2);
      ctx.fillText(truncate(ctx, words.slice(0, half).join(" "), r.w - 6), r.x + r.w / 2, r.y + 28);
      ctx.fillText(truncate(ctx, words.slice(half).join(" "), r.w - 6), r.x + r.w / 2, r.y + 39);
      ctx.fillStyle = owned ? C.violet : C.accentSoft;
      ctx.fillText(owned ? "✓" : `${ab.cost}◆`, r.x + r.w / 2, r.y + 51);
    }

    // Points + focus cooldown.
    ctx.textAlign = "left";
    ctx.font = mono(11);
    ctx.fillStyle = C.violet;
    ctx.fillText(`УЗЛЫ ЭВОЛЮЦИИ ${this.points}`, mx, h - 108);
    if (this.focusCd > 0) {
      ctx.fillStyle = C.dim;
      ctx.font = mono(9);
      ctx.fillText(`фокус через ${this.focusCd.toFixed(0)}с`, mx, h - 124);
    }

    drawHint(ctx, "тап по региону — направить поток · фишки внизу — эволюция", w / 2, h - 16, t);
    ctx.textAlign = "left";
  }
}
