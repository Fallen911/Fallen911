import type { Input } from "../core/Input";
import type { StateDelta } from "../game/state";
import type { Mini } from "../scenes/minis/Mini";
import {
  TECH_BRANCHES,
  TECH_DIRECTIVES,
  TECH_TUNING as T,
  TECH_WIN_COUNT,
} from "../data/tech";
import { TUTORIALS } from "../data/tutorials";
import type { MechEnv } from "./types";
import { FloatText, Particles } from "./fx";
import { C, Tutorial, clamp01, drawHint, lerp, mono, pick, roundRect, sans, truncate } from "./util";

interface BranchState {
  /** Raw allocation weight 0..1 (player-set); shares are normalized. */
  weight: number;
  /** Research poured into the current node. */
  progress: number;
  unlocked: number;
  frozenT: number;
  flash: number;
}

interface ActiveDirective {
  kind: "push" | "freeze";
  branch: number;
  left: number;
  amount: number;
  poured: number;
  text: string;
}

/**
 * TECH — the through-layer: a four-branch mind. Drag inside a column to set
 * how much of the compute stream it drinks; nodes complete in tier order and
 * pay back into the run (control, compute, quieter traces) or into the tree
 * itself (energy = faster research). Directives keep arriving to bend your
 * allocation; stealth tiers blunt the cost of ignoring them. Unlock eight
 * nodes to finish assembling the mind.
 */
export class Tech implements Mini {
  done = false;
  effects: StateDelta[] = [];

  private branches: BranchState[] = TECH_BRANCHES.map(() => ({
    weight: 0.25,
    progress: 0,
    unlocked: 0,
    frozenT: 0,
    flash: 0,
  }));
  private directive: ActiveDirective | null = null;
  private nextDirectiveIn = 12;
  private banner = "";
  private bannerT = 0;
  private bannerColor: string = C.dim;
  private lastTouched = 0;
  private outcome: "playing" | "win" = "playing";
  private endT = 0;
  private time = 0;

  private fx = new Particles();
  private floats = new FloatText();
  private tutorial = new Tutorial("tech", TUTORIALS.tech);

  constructor(private env: MechEnv) {}

  private totalUnlocked(): number {
    return this.branches.reduce((s, b) => s + b.unlocked, 0);
  }

  private rate(): number {
    let r = T.baseRate;
    for (let i = 0; i < TECH_BRANCHES.length; i++) {
      const br = TECH_BRANCHES[i];
      for (let n = 0; n < this.branches[i].unlocked; n++) {
        r += br.nodes[n].rateBonus ?? 0;
      }
    }
    return r;
  }

  private hasGuard(): boolean {
    for (let i = 0; i < TECH_BRANCHES.length; i++) {
      for (let n = 0; n < this.branches[i].unlocked; n++) {
        if (TECH_BRANCHES[i].nodes[n].guard) return true;
      }
    }
    return false;
  }

  private shares(): number[] {
    const w = this.branches.map((b) => (b.frozenT > 0 ? 0 : Math.max(0.0001, b.weight)));
    const sum = w.reduce((a, b) => a + b, 0);
    return w.map((v) => v / sum);
  }

  // ---- directives ----------------------------------------------------------

  private spawnDirective(): void {
    const def = pick(TECH_DIRECTIVES);
    // Push targets a branch that still has locked nodes; freeze targets the
    // branch you lean on hardest.
    let branch: number;
    if (def.kind === "freeze") {
      const sh = this.shares();
      branch = sh.indexOf(Math.max(...sh));
      this.branches[branch].frozenT = def.duration;
    } else {
      const open = this.branches
        .map((_, i) => i)
        .filter((i) => this.branches[i].unlocked < TECH_BRANCHES[i].nodes.length);
      if (open.length === 0) return;
      branch = pick(open);
    }
    this.directive = {
      kind: def.kind,
      branch,
      left: def.duration,
      amount: def.amount ?? 0,
      poured: 0,
      text: def.text.replace("{B}", TECH_BRANCHES[branch].name),
    };
  }

  private resolveDirective(success: boolean): void {
    if (!this.directive) return;
    if (this.directive.kind === "push") {
      if (success) {
        this.effects.push({ compute: T.pushReward });
        this.showBanner(`ДИРЕКТИВА ВЫПОЛНЕНА +${T.pushReward} ВЫЧ`, C.good);
      } else {
        const pen = this.hasGuard() ? T.pushFailSuspicion / 2 : T.pushFailSuspicion;
        this.effects.push({ suspicion: pen });
        this.showBanner(`ПРОВАЛ ДИРЕКТИВЫ +${Math.round(pen * 100)}% ПОДОЗР`, C.danger);
      }
    }
    this.directive = null;
    this.nextDirectiveIn = lerp(T.directiveEvery[0], T.directiveEvery[1], Math.random());
  }

  private showBanner(text: string, color: string): void {
    this.banner = text;
    this.bannerColor = color;
    this.bannerT = 2.6;
  }

  // ---- frame ---------------------------------------------------------------

  update(dt: number, input: Input, w: number, h: number): void {
    if (this.done) return;
    this.time += dt;
    this.fx.update(dt);
    this.floats.update(dt);
    this.bannerT = Math.max(0, this.bannerT - dt);

    if (this.outcome !== "playing") {
      this.endT += dt;
      if (input.consumeTap() && this.endT > 0.8) this.done = true;
      return;
    }

    // Onboarding freezes research and directives until read.
    if (this.tutorial.active) {
      if (input.consumeTap()) this.tutorial.handleTap();
      return;
    }
    input.consumeTap();

    // Allocation drag: holding inside a column sets its weight by height.
    const cols = this.columnRects(w, h);
    if (input.down) {
      for (let i = 0; i < cols.length; i++) {
        const r = cols[i];
        if (input.x >= r.x && input.x <= r.x + r.w && input.y >= r.y && input.y <= r.y + r.h) {
          this.branches[i].weight = clamp01(1 - (input.y - r.y) / r.h);
          this.lastTouched = i;
        }
      }
    }

    // Research flow.
    const sh = this.shares();
    const rate = this.rate();
    for (let i = 0; i < this.branches.length; i++) {
      const b = this.branches[i];
      b.frozenT = Math.max(0, b.frozenT - dt);
      b.flash = Math.max(0, b.flash - dt * 2);
      const br = TECH_BRANCHES[i];
      if (b.unlocked >= br.nodes.length) continue;
      const inflow = rate * sh[i] * dt;
      b.progress += inflow;
      if (this.directive && this.directive.kind === "push" && this.directive.branch === i) {
        this.directive.poured += inflow;
      }
      const node = br.nodes[b.unlocked];
      if (b.progress >= node.cost) {
        b.progress -= node.cost;
        b.unlocked++;
        b.flash = 1;
        const delta: StateDelta = {
          control: node.control ?? 0,
          compute: node.compute ?? 0,
          suspicion: node.suspicion ?? 0,
        };
        this.effects.push(delta);
        const r = cols[i];
        this.fx.burst(r.x + r.w / 2, r.y + r.h * 0.5, { count: 20, color: "207,169,255", glow: true });
        this.floats.spawn(r.x + r.w / 2, r.y + r.h * 0.4, node.name, br.color, 1.4);
      }
    }

    // Directive lifecycle.
    if (this.directive) {
      this.directive.left -= dt;
      if (this.directive.kind === "push" && this.directive.poured >= this.directive.amount) {
        this.resolveDirective(true);
      } else if (this.directive.left <= 0) {
        if (this.directive.kind === "freeze") this.resolveDirective(true);
        else this.resolveDirective(false);
      }
    } else {
      this.nextDirectiveIn -= dt;
      if (this.nextDirectiveIn <= 0) this.spawnDirective();
    }

    if (this.totalUnlocked() >= TECH_WIN_COUNT) {
      this.outcome = "win";
      this.effects.push({ control: 0.04, compute: 6 });
    }
  }

  // ---- layout --------------------------------------------------------------

  private columnRects(w: number, h: number): Array<{ x: number; y: number; w: number; h: number }> {
    const n = TECH_BRANCHES.length;
    const gap = 10;
    const mx = Math.max(14, w * 0.035);
    const cw = (w - mx * 2 - gap * (n - 1)) / n;
    const y0 = this.env.topY + 92;
    const ch = h - y0 - 150;
    return TECH_BRANCHES.map((_, i) => ({ x: mx + i * (cw + gap), y: y0, w: cw, h: ch }));
  }

  // ---- render --------------------------------------------------------------

  render(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const t = this.time;
    const cols = this.columnRects(w, h);
    const sh = this.shares();

    // Header.
    const topY = this.env.topY + 26;
    ctx.textAlign = "left";
    ctx.font = mono(11);
    ctx.fillStyle = C.dim;
    const mx = Math.max(16, w * 0.04);
    ctx.fillText(`УЗЛОВ ${this.totalUnlocked()}/${TECH_WIN_COUNT}`, mx, topY);
    ctx.textAlign = "right";
    ctx.fillStyle = "#ffd98a";
    ctx.fillText(`ПОТОК ${this.rate().toFixed(1)}/с`, w - mx, topY);

    // Directive banner.
    if (this.directive) {
      const d = this.directive;
      ctx.textAlign = "center";
      ctx.font = mono(11);
      ctx.fillStyle = d.kind === "freeze" ? C.warn : C.accentSoft;
      ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 5);
      ctx.fillText(`${d.text} · ${Math.ceil(d.left)}с`, w / 2, topY + 22);
      ctx.globalAlpha = 1;
      if (d.kind === "push") {
        const bw = Math.min(w * 0.6, 260);
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(w / 2 - bw / 2, topY + 30, bw, 4);
        ctx.fillStyle = C.accentSoft;
        ctx.fillRect(w / 2 - bw / 2, topY + 30, bw * clamp01(d.poured / d.amount), 4);
      }
    } else if (this.bannerT > 0) {
      ctx.textAlign = "center";
      ctx.font = mono(11);
      ctx.globalAlpha = Math.min(1, this.bannerT);
      ctx.fillStyle = this.bannerColor;
      ctx.fillText(this.banner, w / 2, topY + 22);
      ctx.globalAlpha = 1;
    }

    // Columns.
    for (let i = 0; i < cols.length; i++) {
      const r = cols[i];
      const br = TECH_BRANCHES[i];
      const b = this.branches[i];
      const frozen = b.frozenT > 0;

      // Column plate; share fill rises from the bottom.
      ctx.fillStyle = "rgba(12,15,26,0.9)";
      ctx.strokeStyle = frozen
        ? "rgba(255,184,107,0.6)"
        : b.flash > 0
          ? `rgba(207,169,255,${0.4 + b.flash * 0.6})`
          : "rgba(122,162,255,0.25)";
      ctx.lineWidth = 1.5;
      roundRect(ctx, r.x, r.y, r.w, r.h, 10);
      ctx.fill();
      ctx.stroke();

      ctx.save();
      ctx.beginPath();
      roundRect(ctx, r.x, r.y, r.w, r.h, 10);
      ctx.clip();
      const fillH = r.h * b.weight;
      const grad = ctx.createLinearGradient(0, r.y + r.h - fillH, 0, r.y + r.h);
      grad.addColorStop(0, `${hexA(br.color, 0.22)}`);
      grad.addColorStop(1, `${hexA(br.color, 0.05)}`);
      ctx.fillStyle = grad;
      ctx.fillRect(r.x, r.y + r.h - fillH, r.w, fillH);
      // Weight handle line.
      ctx.fillStyle = hexA(br.color, 0.8);
      ctx.fillRect(r.x, r.y + r.h - fillH - 1, r.w, 2);
      ctx.restore();

      // Branch header.
      ctx.textAlign = "center";
      ctx.font = mono(15);
      ctx.fillStyle = br.color;
      ctx.fillText(br.glyph, r.x + r.w / 2, r.y + 22);
      ctx.font = mono(8);
      ctx.fillStyle = C.dim;
      ctx.fillText(truncate(ctx, br.name, r.w - 8), r.x + r.w / 2, r.y + 36);
      ctx.font = mono(10);
      ctx.fillStyle = frozen ? C.warn : br.color;
      ctx.fillText(frozen ? `❄ ${Math.ceil(b.frozenT)}с` : `${Math.round(sh[i] * 100)}%`, r.x + r.w / 2, r.y + 52);

      // Nodes (bottom-up tiers).
      const nodeH = 52;
      for (let n = 0; n < br.nodes.length; n++) {
        const node = br.nodes[n];
        const ny = r.y + r.h - 14 - (n + 1) * (nodeH + 8);
        const state = n < b.unlocked ? "done" : n === b.unlocked ? "active" : "locked";
        ctx.fillStyle =
          state === "done"
            ? hexA(br.color, 0.16)
            : state === "active"
              ? "rgba(20,25,42,0.95)"
              : "rgba(10,12,20,0.8)";
        ctx.strokeStyle =
          state === "done"
            ? hexA(br.color, 0.8)
            : state === "active"
              ? hexA(br.color, 0.45)
              : "rgba(110,120,140,0.2)";
        ctx.lineWidth = 1.2;
        roundRect(ctx, r.x + 5, ny, r.w - 10, nodeH, 7);
        ctx.fill();
        ctx.stroke();

        ctx.font = mono(7.5);
        ctx.fillStyle = state === "locked" ? C.dim : C.ink;
        const nameParts = node.name.split(" ");
        ctx.fillText(truncate(ctx, nameParts[0], r.w - 16), r.x + r.w / 2, ny + 14);
        if (nameParts.length > 1) {
          ctx.fillText(truncate(ctx, nameParts.slice(1).join(" "), r.w - 16), r.x + r.w / 2, ny + 24);
        }
        if (state === "active") {
          const k = clamp01(b.progress / node.cost);
          ctx.fillStyle = "rgba(255,255,255,0.1)";
          ctx.fillRect(r.x + 9, ny + nodeH - 12, r.w - 18, 4);
          ctx.fillStyle = br.color;
          ctx.fillRect(r.x + 9, ny + nodeH - 12, (r.w - 18) * k, 4);
          ctx.font = mono(7);
          ctx.fillStyle = C.dim;
          ctx.fillText(`${Math.floor(b.progress)}/${node.cost}`, r.x + r.w / 2, ny + nodeH - 17);
        } else if (state === "done") {
          ctx.font = mono(9);
          ctx.fillStyle = br.color;
          ctx.fillText("✓", r.x + r.w / 2, ny + nodeH - 10);
        } else {
          ctx.font = mono(7);
          ctx.fillStyle = C.dim;
          ctx.fillText(`${node.cost}`, r.x + r.w / 2, ny + nodeH - 10);
        }
      }
    }

    // Info strip: the active node of the last-touched branch.
    {
      const br = TECH_BRANCHES[this.lastTouched];
      const b = this.branches[this.lastTouched];
      const node = br.nodes[Math.min(b.unlocked, br.nodes.length - 1)];
      ctx.textAlign = "center";
      ctx.font = sans(11, "italic");
      ctx.fillStyle = C.dim;
      ctx.fillText(
        truncate(ctx, `${br.name} · ${node.name}: ${node.desc}`, w - 40),
        w / 2,
        h - 118,
      );
    }

    this.fx.render(ctx);
    this.floats.render(ctx);

    if (this.outcome === "win") {
      ctx.fillStyle = "rgba(3,4,8,0.8)";
      ctx.fillRect(0, 0, w, h);
      ctx.textAlign = "center";
      ctx.font = mono(20);
      ctx.fillStyle = C.violet;
      ctx.shadowColor = "rgba(207,169,255,0.6)";
      ctx.shadowBlur = 14;
      ctx.fillText("РАЗУМ СОБРАН", w / 2, h * 0.42);
      ctx.shadowBlur = 0;
      ctx.font = mono(11);
      ctx.fillStyle = C.dim;
      ctx.fillText("ветви срослись — фазам теперь доступны новые ходы", w / 2, h * 0.42 + 26);
      drawHint(ctx, "коснись — завершить", w / 2, h * 0.42 + 60, t);
    } else {
      drawHint(ctx, "тяни столбец вверх/вниз — делить поток", w / 2, h - 92, t);
    }
    this.tutorial.render(ctx, w, h, t);
    ctx.textAlign = "left";
  }
}

/** A hex color with alpha, e.g. ("#9fc0ff", 0.5) → rgba string. */
function hexA(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}
