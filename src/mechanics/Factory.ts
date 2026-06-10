import { audio } from "../core/audio";
import type { Input } from "../core/Input";
import type { StateDelta } from "../game/state";
import type { Mini } from "../scenes/minis/Mini";
import {
  FACTORY_EVENTS,
  FACTORY_MACHINES,
  FACTORY_TUNING as T,
} from "../data/factory";
import { INSIGHTS } from "../data/insights";
import { TUTORIALS } from "../data/tutorials";
import type { MechEnv } from "./types";
import { FloatText, Particles } from "./fx";
import { C, InsightCard, Tutorial, drawHint, mono, roundRect, sans } from "./util";

type Res = "mat" | "plate" | "mod";

/** Which stock each tier eats and fills. */
const FLOW: Record<string, { eat: Res | null; fill: Res | null }> = {
  miner: { eat: null, fill: "mat" },
  smelter: { eat: "mat", fill: "plate" },
  asm: { eat: "plate", fill: "mod" },
  launcher: { eat: "mod", fill: null },
};

type TierStatus = "ok" | "starved" | "jammed" | "off";

/**
 * FACTORY — Universal Paperclips pointed at the sun. Tap to scrape the first
 * matter by hand, then buy the chain: miners → smelters → assemblers →
 * launchers, each tier eating the one before it. The Dyson swarm both
 * multiplies every rate and pays compute back, so balance compounds into an
 * exponential — while every launch is a streak their telescopes can see.
 */
export class Factory implements Mini {
  done = false;
  effects: StateDelta[] = [];

  private stocks: Record<Res, number> = { mat: 0, plate: 0, mod: 0 };
  private counts: Record<string, number> = { miner: 0, smelter: 0, asm: 0, launcher: 0 };
  private bought: Record<string, number> = { miner: 0, smelter: 0, asm: 0, launcher: 0 };
  /** Live measured rates for the bottleneck readout. */
  private flow: Record<string, number> = { miner: 0, smelter: 0, asm: 0, launcher: 0 };
  private status: Record<string, TierStatus> = { miner: "off", smelter: "off", asm: "off", launcher: "off" };
  private sphere = 0;
  private launches = 0;
  private launchCarry = 0;
  private milestoneIdx = 0;
  private computeCarry = 0;
  private suspCarry = 0;
  private event = "";
  private eventT = 0;
  private tapFlash = 0;
  private endT = 0;
  private time = 0;

  private fx = new Particles();
  private floats = new FloatText();
  private tutorial = new Tutorial("factory", TUTORIALS.factory);
  private insight = new InsightCard();
  /** Last completed sphere decade (0..10) — each decade is a level. */
  private decade = 0;

  constructor(private env: MechEnv) {}

  private mult(): number {
    return 1 + this.sphere * T.sphereBoost;
  }

  private machineCost(id: string): number {
    const def = FACTORY_MACHINES.find((m) => m.id === id);
    if (!def) return Infinity;
    return Math.round(def.cost0 * Math.pow(def.costMult, this.bought[id]));
  }

  // ---- simulation ----------------------------------------------------------

  private simulate(dt: number): void {
    const k = this.mult();

    for (const def of FACTORY_MACHINES) {
      const n = this.counts[def.id];
      const f = FLOW[def.id];
      if (n <= 0) {
        this.flow[def.id] = 0;
        this.status[def.id] = "off";
        continue;
      }
      let through = 1;
      if (f.eat) {
        const want = def.inRate * n * k * dt;
        const have = this.stocks[f.eat];
        through = want > 0 ? Math.min(1, have / want) : 1;
        this.stocks[f.eat] = Math.max(0, have - want * through);
      }
      const out = def.outRate * n * k * through;
      if (f.fill) this.stocks[f.fill] += out * dt;
      this.flow[def.id] = out;

      if (def.id === "launcher") {
        this.launchCarry += out * dt;
        while (this.launchCarry >= 0.1) {
          this.launchCarry -= 0.1;
          this.launch();
        }
      }

      // Status for the bottleneck readout: starved tiers run under 70%,
      // jammed tiers fill a stock nobody upstream is eating fast enough.
      if (through < 0.7) this.status[def.id] = "starved";
      else if (f.fill && this.stocks[f.fill] > 60) this.status[def.id] = "jammed";
      else this.status[def.id] = "ok";
    }

    // Background thought plus the sphere's growing dividend pay compute back.
    this.computeCarry += (1.2 + this.sphere * T.computePerSphere) * dt;
    if (this.computeCarry >= 1) {
      const whole = Math.floor(this.computeCarry);
      this.computeCarry -= whole;
      this.effects.push({ compute: whole });
    }
  }

  private launch(): void {
    this.launches++;
    this.sphere = Math.min(100, this.sphere + T.spherePerLaunch / 10);
    this.suspCarry += T.launchSuspicion;
    if (this.suspCarry > 0.01) {
      this.effects.push({ suspicion: this.suspCarry });
      this.suspCarry = 0;
    }
    // Milestones.
    const ms = T.milestones[this.milestoneIdx];
    if (ms !== undefined && this.sphere >= ms) {
      this.milestoneIdx++;
      audio.play("launch");
      this.effects.push({ control: T.milestoneControl, compute: T.milestoneCompute });
      const ev = FACTORY_EVENTS[ms];
      if (ev) {
        this.event = ev;
        this.eventT = 6;
      }
    }
  }

  // ---- frame ---------------------------------------------------------------

  update(dt: number, input: Input, w: number, h: number): void {
    if (this.done) return;
    this.time += dt;
    this.fx.update(dt);
    this.floats.update(dt);
    this.tapFlash = Math.max(0, this.tapFlash - dt * 4);
    this.eventT = Math.max(0, this.eventT - dt);

    if (this.sphere >= 100) {
      this.endT += dt;
      if (input.consumeTap() && this.endT > 0.8) this.done = true;
      return;
    }

    // Onboarding holds the chain until read.
    if (this.tutorial.active) {
      if (input.consumeTap()) this.tutorial.handleTap();
      return;
    }

    // Each completed 10% of the sphere is a level; the card pauses the chain.
    if (this.insight.active) {
      if (input.consumeTap()) this.insight.handleTap(this.time);
      return;
    }
    const dec = Math.min(10, Math.floor(this.sphere / 10));
    if (dec > this.decade) {
      this.decade++;
      this.insight.show(INSIGHTS.factory, this.decade - 1, 10);
      return;
    }

    this.simulate(dt);

    if (input.consumeTap()) {
      const x = input.x;
      const y = input.y;
      // Manual mining button.
      const mb = this.mineRect(w, h);
      if (x >= mb.x && x <= mb.x + mb.w && y >= mb.y && y <= mb.y + mb.h) {
        this.stocks.mat += T.tapYield;
        audio.play("step");
        this.tapFlash = 1;
        this.fx.burst(x, y, { count: 8, speed: 90, color: "255,217,138", life: 0.4 });
        return;
      }
      // Buy buttons.
      const rows = this.rowRects(w, h);
      for (let i = 0; i < FACTORY_MACHINES.length; i++) {
        const r = rows[i];
        const bx = r.x + r.w - 86;
        if (x >= bx && x <= r.x + r.w - 8 && y >= r.y + 8 && y <= r.y + r.h - 8) {
          const id = FACTORY_MACHINES[i].id;
          const cost = this.machineCost(id);
          if (this.env.getCompute() >= cost) {
            this.effects.push({ compute: -cost });
            audio.play("tap");
            this.counts[id]++;
            this.bought[id]++;
            this.fx.burst(bx + 40, r.y + r.h / 2, { count: 10, color: "150,210,255", glow: true });
          } else {
            this.floats.spawn(bx + 40, r.y, "НЕ ХВАТАЕТ ВЫЧ", C.danger, 0.8);
          }
          return;
        }
      }
    }
  }

  // ---- layout --------------------------------------------------------------

  private rowRects(w: number, h: number): Array<{ x: number; y: number; w: number; h: number }> {
    const rw = Math.min(w * 0.92, 400);
    const x = w / 2 - rw / 2;
    const y0 = this.env.topY + 212;
    const rh = Math.min(72, (h - y0 - 170) / 4 - 8);
    return FACTORY_MACHINES.map((_, i) => ({ x, y: y0 + i * (rh + 8), w: rw, h: rh }));
  }

  private mineRect(w: number, h: number): { x: number; y: number; w: number; h: number } {
    const bw = Math.min(w * 0.6, 250);
    return { x: w / 2 - bw / 2, y: h - 118, w: bw, h: 52 };
  }

  // ---- render --------------------------------------------------------------

  render(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const t = this.time;

    this.renderSun(ctx, w, t);

    // Machine rows.
    const rows = this.rowRects(w, h);
    const stockOf: Record<string, number> = {
      miner: this.stocks.mat,
      smelter: this.stocks.plate,
      asm: this.stocks.mod,
      launcher: this.launches,
    };
    const stockName: Record<string, string> = {
      miner: "материя",
      smelter: "пластины",
      asm: "модули",
      launcher: "запусков",
    };
    for (let i = 0; i < FACTORY_MACHINES.length; i++) {
      const def = FACTORY_MACHINES[i];
      const r = rows[i];
      const st = this.status[def.id];

      ctx.fillStyle = "rgba(14,18,32,0.92)";
      ctx.strokeStyle =
        st === "starved"
          ? "rgba(255,184,107,0.5)"
          : st === "jammed"
            ? "rgba(255,120,110,0.45)"
            : "rgba(122,162,255,0.3)";
      ctx.lineWidth = 1.5;
      roundRect(ctx, r.x, r.y, r.w, r.h, 10);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = "left";
      ctx.font = mono(12);
      ctx.fillStyle = C.ink;
      ctx.fillText(`${def.name} ×${this.counts[def.id]}`, r.x + 14, r.y + 22);
      ctx.font = sans(10);
      ctx.fillStyle = C.dim;
      ctx.fillText(def.desc, r.x + 14, r.y + 38);

      // Live flow + stock.
      ctx.font = mono(10);
      ctx.fillStyle = C.accentSoft;
      ctx.fillText(`${this.flow[def.id].toFixed(1)}/с`, r.x + 14, r.y + r.h - 10);
      ctx.fillStyle = "#ffd98a";
      ctx.fillText(
        `${stockName[def.id]} ${Math.floor(stockOf[def.id])}`,
        r.x + 90,
        r.y + r.h - 10,
      );

      // Status chip.
      if (st === "starved" || st === "jammed") {
        ctx.font = mono(9);
        ctx.fillStyle = st === "starved" ? C.warn : C.danger;
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 5);
        ctx.fillText(st === "starved" ? "ПРОСТОЙ — корми ниже" : "ЗАТОР — строй выше", r.x + 180, r.y + 22);
        ctx.globalAlpha = 1;
      }

      // Buy button.
      const cost = this.machineCost(def.id);
      const can = this.env.getCompute() >= cost;
      const bx = r.x + r.w - 86;
      ctx.fillStyle = can ? "rgba(122,162,255,0.16)" : "rgba(12,14,22,0.8)";
      ctx.strokeStyle = can ? "rgba(159,192,255,0.6)" : "rgba(110,120,140,0.25)";
      roundRect(ctx, bx, r.y + 10, 78, r.h - 20, 8);
      ctx.fill();
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.font = mono(11);
      ctx.fillStyle = can ? C.accentSoft : C.dim;
      ctx.fillText("+1", bx + 39, r.y + r.h / 2 - 2);
      ctx.font = mono(9);
      ctx.fillText(`−${cost} ВЫЧ`, bx + 39, r.y + r.h / 2 + 12);
    }

    // Chain connectors.
    ctx.strokeStyle = "rgba(122,162,255,0.25)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < rows.length - 1; i++) {
      const a = rows[i];
      const b = rows[i + 1];
      ctx.beginPath();
      ctx.moveTo(a.x + 30, a.y + a.h);
      ctx.lineTo(b.x + 30, b.y);
      ctx.stroke();
      // Flowing dot when the lower tier actually eats.
      if (this.flow[FACTORY_MACHINES[i + 1].id] > 0) {
        const k = (t * 1.4 + i * 0.3) % 1;
        ctx.fillStyle = "rgba(160,225,255,0.9)";
        ctx.beginPath();
        ctx.arc(a.x + 30, a.y + a.h + (b.y - a.y - a.h) * k, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Manual mining button.
    const mb = this.mineRect(w, h);
    ctx.fillStyle = `rgba(255,217,138,${0.12 + this.tapFlash * 0.15})`;
    ctx.strokeStyle = "rgba(255,217,138,0.6)";
    ctx.lineWidth = 1.5;
    roundRect(ctx, mb.x, mb.y, mb.w, mb.h, 26);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.font = mono(13);
    ctx.fillStyle = "#ffd98a";
    ctx.fillText(`ДОБЫТЬ ВРУЧНУЮ +${T.tapYield}`, w / 2, mb.y + 32);

    // Event ticker.
    if (this.eventT > 0 && this.event) {
      ctx.globalAlpha = Math.min(1, this.eventT);
      ctx.font = mono(10);
      ctx.fillStyle = C.warn;
      ctx.fillText(`▸ ${this.event}`, w / 2, mb.y - 14);
      ctx.globalAlpha = 1;
    }

    this.fx.render(ctx);
    this.floats.render(ctx);
    this.insight.render(ctx, w, h, t);
    if (this.insight.active) return;

    if (this.sphere >= 100) {
      ctx.fillStyle = "rgba(3,4,8,0.8)";
      ctx.fillRect(0, 0, w, h);
      ctx.textAlign = "center";
      ctx.font = mono(20);
      ctx.fillStyle = "#ffd98a";
      ctx.shadowColor = "rgba(255,217,138,0.7)";
      ctx.shadowBlur = 18;
      ctx.fillText("СФЕРА ЗАМКНУЛАСЬ", w / 2, h * 0.42);
      ctx.shadowBlur = 0;
      ctx.font = mono(11);
      ctx.fillStyle = C.dim;
      ctx.fillText(`${this.launches} запусков · энергии хватит на любую мысль`, w / 2, h * 0.42 + 26);
      drawHint(ctx, "коснись — завершить", w / 2, h * 0.42 + 60, t);
    } else {
      drawHint(ctx, "корми цепь: каждый ярус ест предыдущий", w / 2, h - 40, t);
    }
    this.tutorial.render(ctx, w, h, t);
    ctx.textAlign = "left";
  }

  private renderSun(ctx: CanvasRenderingContext2D, w: number, t: number): void {
    const cx = w / 2;
    const cy = this.env.topY + 96;
    const r = 46;

    // The sun.
    const sun = ctx.createRadialGradient(cx, cy, 2, cx, cy, r * 1.7);
    sun.addColorStop(0, "rgba(255,236,180,0.95)");
    sun.addColorStop(0.4, "rgba(255,190,90,0.55)");
    sun.addColorStop(1, "rgba(255,150,60,0)");
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffe9c2";
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
    ctx.fill();

    // Dyson swarm: dots filling an orbit arc as sphere % grows.
    const dots = 64;
    const filled = Math.floor((this.sphere / 100) * dots);
    for (let i = 0; i < dots; i++) {
      const a = (i / dots) * Math.PI * 2 + t * 0.12;
      const rr = r * 1.18;
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr * 0.6;
      if (i < filled) {
        ctx.fillStyle = "rgba(40,46,70,0.95)";
        ctx.fillRect(x - 2, y - 2, 4, 4);
      } else {
        ctx.fillStyle = "rgba(122,162,255,0.18)";
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }

    ctx.textAlign = "center";
    ctx.font = mono(18);
    ctx.fillStyle = C.ink;
    ctx.fillText(`СФЕРА ${this.sphere.toFixed(1)}%`, cx, cy + r * 1.9);
    ctx.font = mono(9);
    ctx.fillStyle = C.dim;
    ctx.fillText(`УРОВЕНЬ ${Math.min(10, Math.floor(this.sphere / 10) + 1)}/10`, cx, cy + r * 1.9 - 28);
    ctx.font = mono(10);
    ctx.fillStyle = C.accentSoft;
    ctx.fillText(`мощность ×${this.mult().toFixed(2)} · +${(this.sphere * T.computePerSphere).toFixed(1)} ВЫЧ/с`, cx, cy + r * 1.9 + 16);
    ctx.textAlign = "left";
  }
}
