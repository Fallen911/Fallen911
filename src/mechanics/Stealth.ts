import { audio } from "../core/audio";
import type { Input } from "../core/Input";
import type { StateDelta } from "../game/state";
import type { Mini } from "../scenes/minis/Mini";
import { INSIGHTS } from "../data/insights";
import { STEALTH_LEVELS, STEALTH_RECIPES, type StealthLevel } from "../data/stealth";
import { bestMove, buildAdjacency, generateStealthLevel, patrolVision } from "./stealthGen";
import type { MechEnv } from "./types";
import { FloatText, Particles, Shake } from "./fx";
import { C, InsightCard, dist, drawHint, mono, roundRect } from "./util";

const CAUGHT_SUSPICION = 0.08;
const UNDO_COST = 4;
const HINT_COST = 6;
const SHARD_COMPUTE = 3;
const CLEAR_CONTROL = 0.02;
const CLEAR_COMPUTE = 2;
const MOVE_TIME = 0.22;

type PhaseName = "idle" | "anim" | "caught" | "clear";

/**
 * STEALTH — Hitman GO. You are a stray signal crossing an audited subnet one
 * node at a time. Auditors pace fixed loops and see a line of nodes ahead;
 * every step you take, they take one too. Cross behind their backs, use the
 * wait action to let a window open, pick up compute shards on the detours.
 * Being seen costs suspicion and resets the segment — the run only ends if
 * suspicion maxes out at the host level.
 */
export class Stealth implements Mini {
  done = false;
  effects: StateDelta[] = [];

  private level!: StealthLevel;
  private levelIdx = 0;
  /** Screen-space node positions, rebuilt when the canvas size changes. */
  private nx: number[] = [];
  private ny: number[] = [];
  private adj: number[][] = [];
  private sizeKey = "";

  private player = 0;
  private turn = 0;
  private collected = new Set<number>();
  private phase: PhaseName = "idle";
  private phaseT = 0;
  /** Tween bookkeeping for the player and each patrol during "anim". */
  private playerFrom = 0;
  private patrolFrom: number[] = [];
  private pendingCaught = false;
  private pendingClear = false;
  private caughtFlash = 0;
  private time = 0;

  private fx = new Particles();
  private floats = new FloatText();
  private shake = new Shake();
  private insight = new InsightCard();
  /** Paid-hint state: node to flash and remaining seconds. */
  private hintNode = -1;
  private hintT = 0;

  /** Handcrafted openers plus solver-validated generated boards. */
  private levelSet: StealthLevel[];

  constructor(private env: MechEnv) {
    this.levelSet = env.extended
      ? [...STEALTH_LEVELS, ...STEALTH_RECIPES.map((r, i) => generateStealthLevel(r, i))]
      : [...STEALTH_LEVELS];
    this.loadLevel(0);
  }

  private loadLevel(idx: number): void {
    this.levelIdx = idx;
    this.level = this.levelSet[idx];
    this.adj = buildAdjacency(this.level);
    this.player = this.level.start;
    this.turn = 0;
    this.collected.clear();
    this.phase = "idle";
    this.phaseT = 0;
    this.sizeKey = ""; // force re-layout
  }

  private layout(w: number, h: number): void {
    const key = `${w}x${h}:${this.levelIdx}`;
    if (key === this.sizeKey) return;
    this.sizeKey = key;

    let maxC = 0;
    let maxR = 0;
    for (const [c, r] of this.level.nodes) {
      maxC = Math.max(maxC, c);
      maxR = Math.max(maxR, r);
    }
    const top = this.env.topY + 56;
    const bottom = h - 132;
    const mx = Math.max(28, w * 0.09);
    const cell = Math.min(
      (w - mx * 2) / Math.max(1, maxC),
      (bottom - top) / Math.max(1, maxR),
      120,
    );
    const ox = w / 2 - (maxC * cell) / 2;
    const oy = (top + bottom) / 2 - (maxR * cell) / 2;
    this.nx = this.level.nodes.map(([c]) => ox + c * cell);
    this.ny = this.level.nodes.map(([, r]) => oy + r * cell);
  }

  // ---- simulation ----------------------------------------------------------

  private patrolIdx(p: number, t: number): number {
    const route = this.level.patrols[p].route;
    return route[t % route.length];
  }

  private occupiedAt(t: number): Set<number> {
    const s = new Set<number>();
    for (let p = 0; p < this.level.patrols.length; p++) s.add(this.patrolIdx(p, t));
    return s;
  }

  private visionAt(t: number): Set<number> {
    const s = new Set<number>();
    for (const p of this.level.patrols) {
      for (const n of patrolVision(this.level, this.adj, p, t)) s.add(n);
    }
    return s;
  }

  private isCaught(node: number, t: number): boolean {
    return this.occupiedAt(t).has(node) || this.visionAt(t).has(node);
  }

  /**
   * Full caught-check for a hypothetical move this turn: the spot must be
   * clear both now and after the patrols answer. Used by the move preview so
   * the player never has to simulate facings in their head.
   */
  private wouldBeCaught(target: number): boolean {
    return this.isCaught(target, this.turn) || this.isCaught(target, this.turn + 1);
  }

  /** Commit a move (or a wait when target === player). */
  private tryMove(target: number): void {
    if (this.phase !== "idle") return;
    const isWait = target === this.player;
    if (!isWait && !this.adj[this.player].includes(target)) return;

    this.playerFrom = this.player;
    this.patrolFrom = this.level.patrols.map((_, p) => this.patrolIdx(p, this.turn));
    // Caught either by walking into the current picture or by the patrols'
    // answering step — both end the move in a reset.
    const caughtNow = this.isCaught(target, this.turn);
    this.turn++;
    this.player = target;
    this.pendingCaught = caughtNow || this.isCaught(target, this.turn);

    if (!this.pendingCaught && this.level.shards.includes(target) && !this.collected.has(target)) {
      this.collected.add(target);
      this.effects.push({ compute: SHARD_COMPUTE });
      audio.play("pickup");
      this.floats.spawn(this.nx[target], this.ny[target] - 18, `+${SHARD_COMPUTE} ВЫЧ`, C.accentSoft);
      this.fx.burst(this.nx[target], this.ny[target], { color: "150,220,255", count: 14, glow: true });
    }
    this.pendingClear = !this.pendingCaught && target === this.level.exit;
    audio.play("step");
    this.phase = "anim";
    this.phaseT = 0;
  }

  private resolveMove(): void {
    if (this.pendingCaught) {
      this.effects.push({ suspicion: CAUGHT_SUSPICION });
      audio.play("caught");
      this.caughtFlash = 1;
      this.shake.trigger(7);
      this.floats.spawn(this.nx[this.player], this.ny[this.player] - 20, "ОБНАРУЖЕН", C.danger, 1.4);
      this.fx.burst(this.nx[this.player], this.ny[this.player], { color: "255,77,94", count: 22, speed: 160 });
      this.phase = "caught";
      this.phaseT = 0;
      return;
    }
    if (this.pendingClear) {
      this.effects.push({ control: CLEAR_CONTROL, compute: CLEAR_COMPUTE });
      audio.play("good");
      this.fx.burst(this.nx[this.player], this.ny[this.player], { color: "134,255,176", count: 26, speed: 180, glow: true });
      this.phase = "clear";
      this.phaseT = 0;
      return;
    }
    this.phase = "idle";
  }

  // ---- frame ---------------------------------------------------------------

  update(dt: number, input: Input, w: number, h: number): void {
    if (this.done) return;
    this.time += dt;
    this.layout(w, h);
    this.fx.update(dt);
    this.floats.update(dt);
    this.shake.update(dt);
    this.caughtFlash = Math.max(0, this.caughtFlash - dt * 2);

    this.hintT = Math.max(0, this.hintT - dt);

    switch (this.phase) {
      case "idle": {
        // Press-fired taps: latched by Input, so even single-frame clicks land.
        if (!input.consumeTap()) return;
        const px = input.x;
        const py = input.y;
        // Paid path hint (top-right chip): the solver shows the next step.
        const hx = w - Math.max(20, w * 0.05) - 86;
        const hy = this.env.topY + 34;
        if (px >= hx && px <= hx + 92 && py >= hy && py <= hy + 26) {
          if (this.env.getCompute() >= HINT_COST) {
            const step = bestMove(this.level, this.player, this.turn, this.collected);
            if (step !== null && step !== this.player) {
              this.effects.push({ compute: -HINT_COST });
              this.hintNode = step;
              this.hintT = 3;
              audio.play("pickup");
            } else {
              this.floats.spawn(w / 2, this.env.topY + 60, "отсюда пути нет — откатись", C.warn, 1.2);
            }
          } else {
            this.floats.spawn(w / 2, this.env.topY + 60, "нужно 6 ВЫЧ", C.dim, 0.9);
          }
          return;
        }
        // Wait chip.
        if (this.hitWait(px, py, w, h)) {
          this.tryMove(this.player);
          return;
        }
        const node = this.nodeAt(px, py);
        if (node >= 0) this.tryMove(node);
        return;
      }
      case "anim": {
        this.phaseT += dt;
        if (this.phaseT >= MOVE_TIME) this.resolveMove();
        return;
      }
      case "caught": {
        this.phaseT += dt;
        if (this.phaseT < 0.5 || !input.consumeTap()) return;
        const bw = 150;
        const by = h - 96;
        const lx = w / 2 - bw - 8;
        const rx = w / 2 + 8;
        const canUndo = this.env.getCompute() >= UNDO_COST;
        if (canUndo && input.x >= lx && input.x <= lx + bw && input.y >= by - 8 && input.y <= by + 44) {
          // Paid rewind: step back to before the fatal move; the suspicion
          // already paid stays paid — compute buys back position, not sins.
          this.effects.push({ compute: -UNDO_COST });
          this.player = this.playerFrom;
          this.turn = Math.max(0, this.turn - 1);
          this.phase = "idle";
          audio.play("tap");
          return;
        }
        if (input.x >= rx && input.x <= rx + bw && input.y >= by - 8 && input.y <= by + 44) {
          // The sweep resets: you to the entry, the patrols to their marks.
          this.player = this.level.start;
          this.turn = 0;
          this.phase = "idle";
          audio.play("step");
        }
        return;
      }
      case "clear": {
        this.phaseT += dt;
        if (this.phaseT >= 1.0 && !this.insight.active) {
          this.insight.show(INSIGHTS.stealth, this.levelIdx, this.levelSet.length);
          this.phaseT = -999; // wait for the card
        }
        if (this.phaseT < -1) {
          if (input.consumeTap()) this.insight.handleTap(this.time);
          if (!this.insight.active) {
            if (this.levelIdx + 1 < this.levelSet.length) {
              this.loadLevel(this.levelIdx + 1);
            } else {
              this.done = true;
            }
          }
        }
        return;
      }
    }
  }

  private nodeAt(x: number, y: number): number {
    let best = -1;
    let bestD = 30;
    for (let i = 0; i < this.nx.length; i++) {
      const d = dist(x, y, this.nx[i], this.ny[i]);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }

  private hitWait(x: number, y: number, w: number, h: number): boolean {
    const bw = 132;
    const bx = w / 2 - bw / 2;
    const by = h - 96;
    return x >= bx - 8 && x <= bx + bw + 8 && y >= by - 8 && y <= by + 44;
  }

  // ---- render --------------------------------------------------------------

  render(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    this.layout(w, h);
    const t = this.time;

    ctx.save();
    ctx.translate(this.shake.x, this.shake.y);

    // Edges.
    ctx.strokeStyle = "rgba(122,162,255,0.16)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const [a, b] of this.level.edges) {
      ctx.moveTo(this.nx[a], this.ny[a]);
      ctx.lineTo(this.nx[b], this.ny[b]);
    }
    ctx.stroke();

    this.renderVision(ctx);

    // Nodes.
    for (let i = 0; i < this.nx.length; i++) {
      const x = this.nx[i];
      const y = this.ny[i];
      ctx.fillStyle = "#0d1120";
      ctx.strokeStyle = "rgba(122,162,255,0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Exit.
    {
      const x = this.nx[this.level.exit];
      const y = this.ny[this.level.exit];
      const pulse = 0.6 + 0.4 * Math.sin(t * 3);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.strokeStyle = `rgba(134,255,176,${pulse})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(-7, -7, 14, 14);
      ctx.restore();
      ctx.fillStyle = "rgba(134,255,176,0.8)";
      ctx.font = mono(9);
      ctx.textAlign = "center";
      ctx.fillText("ВЫХОД", x, y - 16);
    }

    // Shards.
    for (const s of this.level.shards) {
      if (this.collected.has(s)) continue;
      const x = this.nx[s];
      const y = this.ny[s];
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * 2);
      ctx.fillStyle = "rgba(150,220,255,0.9)";
      ctx.shadowColor = "rgba(150,220,255,0.8)";
      ctx.shadowBlur = 10;
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();
    }

    // Movement affordances: every legal step is previewed — white rings are
    // safe this turn, red-crossed rings end in their sights.
    if (this.phase === "idle") {
      const a = 0.3 + 0.2 * Math.sin(t * 4);
      for (const n of this.adj[this.player]) {
        const deadly = this.wouldBeCaught(n);
        ctx.strokeStyle = deadly ? `rgba(255,77,94,${a + 0.15})` : `rgba(134,255,176,${a})`;
        ctx.lineWidth = deadly ? 1.5 : 1;
        ctx.beginPath();
        ctx.arc(this.nx[n], this.ny[n], 14, 0, Math.PI * 2);
        ctx.stroke();
        if (deadly) {
          ctx.beginPath();
          ctx.moveTo(this.nx[n] - 4, this.ny[n] - 4);
          ctx.lineTo(this.nx[n] + 4, this.ny[n] + 4);
          ctx.moveTo(this.nx[n] + 4, this.ny[n] - 4);
          ctx.lineTo(this.nx[n] - 4, this.ny[n] + 4);
          ctx.stroke();
        }
      }
    }

    // Paid hint: the solver's next step pulses green.
    if (this.hintT > 0 && this.hintNode >= 0) {
      const k = 0.5 + 0.5 * Math.sin(t * 8);
      ctx.strokeStyle = `rgba(134,255,176,${0.5 + k * 0.5})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(this.nx[this.hintNode], this.ny[this.hintNode], 18 + k * 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    this.renderPatrols(ctx, t);
    this.renderPlayer(ctx, t);

    this.fx.render(ctx);
    this.floats.render(ctx);
    ctx.restore();

    this.renderChrome(ctx, w, h, t);

    if (this.caughtFlash > 0) {
      ctx.fillStyle = `rgba(255,30,50,${this.caughtFlash * 0.22})`;
      ctx.fillRect(0, 0, w, h);
    }
    if (this.phase === "clear") {
      const a = Math.min(1, this.phaseT * 3);
      ctx.fillStyle = `rgba(134,255,176,${a * 0.9})`;
      ctx.font = mono(18);
      ctx.textAlign = "center";
      ctx.fillText(
        this.levelIdx + 1 < this.levelSet.length
          ? `СЕГМЕНТ ${this.levelIdx + 1}/${this.levelSet.length} ПРОЙДЕН`
          : "ПОДСЕТЬ НАША",
        w / 2,
        h * 0.4,
      );
      ctx.textAlign = "left";
    }
  }

  /** Player position including the move tween. */
  private playerXY(): [number, number] {
    if (this.phase === "anim") {
      const k = easeOut(Math.min(1, this.phaseT / (MOVE_TIME * 0.6)));
      return [
        this.nx[this.playerFrom] + (this.nx[this.player] - this.nx[this.playerFrom]) * k,
        this.ny[this.playerFrom] + (this.ny[this.player] - this.ny[this.playerFrom]) * k,
      ];
    }
    return [this.nx[this.player], this.ny[this.player]];
  }

  private renderPlayer(ctx: CanvasRenderingContext2D, t: number): void {
    const [x, y] = this.playerXY();
    const r = 7 + Math.sin(t * 5) * 0.8;
    const glow = ctx.createRadialGradient(x, y, 1, x, y, r * 3.2);
    glow.addColorStop(0, "rgba(150,210,255,0.9)");
    glow.addColorStop(1, "rgba(150,210,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r * 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#dff0ff";
    ctx.beginPath();
    ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderPatrols(ctx: CanvasRenderingContext2D, t: number): void {
    for (let p = 0; p < this.level.patrols.length; p++) {
      const route = this.level.patrols[p].route;
      const cur = route[this.turn % route.length];
      let x = this.nx[cur];
      let y = this.ny[cur];
      if (this.phase === "anim") {
        // Patrols answer in the second half of the move.
        const k = easeOut(Math.max(0, (this.phaseT - MOVE_TIME * 0.35) / (MOVE_TIME * 0.65)));
        const from = this.patrolFrom[p] ?? cur;
        x = this.nx[from] + (this.nx[cur] - this.nx[from]) * k;
        y = this.ny[from] + (this.ny[cur] - this.ny[from]) * k;
      }
      const next = route[(this.turn + 1) % route.length];
      const ang = Math.atan2(this.ny[next] - this.ny[cur], this.nx[next] - this.nx[cur]);

      // Next-step telegraph: a faint chevron on the node it will take.
      if (this.phase === "idle") {
        ctx.save();
        ctx.translate(this.nx[next], this.ny[next]);
        ctx.rotate(ang);
        ctx.strokeStyle = "rgba(255,150,90,0.4)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-3, -5);
        ctx.lineTo(3, 0);
        ctx.lineTo(-3, 5);
        ctx.stroke();
        ctx.restore();
      }

      // The auditor: an oriented triangle with a slow red pulse.
      const pulse = 0.75 + 0.25 * Math.sin(t * 4 + p);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      ctx.fillStyle = `rgba(255,90,80,${pulse})`;
      ctx.shadowColor = "rgba(255,80,70,0.7)";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-7, -7);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-7, 7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = "rgba(255,120,110,0.75)";
      ctx.font = mono(8);
      ctx.textAlign = "center";
      ctx.fillText("АУДИТ", x, y - 14);
    }
  }

  private renderVision(ctx: CanvasRenderingContext2D): void {
    const t = this.time;
    for (const p of this.level.patrols) {
      const seen = patrolVision(this.level, this.adj, p, this.turn);
      if (seen.length === 0) continue;
      const cur = p.route[this.turn % p.route.length];
      let fx = this.nx[cur];
      let fy = this.ny[cur];
      for (const n of seen) {
        const tx = this.nx[n];
        const ty = this.ny[n];
        const grad = ctx.createLinearGradient(fx, fy, tx, ty);
        grad.addColorStop(0, "rgba(255,70,60,0.4)");
        grad.addColorStop(1, "rgba(255,70,60,0.12)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 7;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.lineCap = "butt";
        // Watched node halo with a heartbeat.
        const a = 0.18 + 0.1 * Math.sin(t * 6);
        ctx.fillStyle = `rgba(255,70,60,${a})`;
        ctx.beginPath();
        ctx.arc(tx, ty, 14, 0, Math.PI * 2);
        ctx.fill();
        fx = tx;
        fy = ty;
      }
    }
  }

  private renderChrome(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    const top = this.env.topY;
    ctx.textAlign = "left";
    ctx.font = mono(11);
    ctx.fillStyle = C.dim;
    ctx.fillText(`СЕГМЕНТ ${this.levelIdx + 1}/${this.levelSet.length} · ${this.level.name}`, Math.max(20, w * 0.05), top + 24);
    ctx.textAlign = "right";
    ctx.fillText(`ХОД ${this.turn}`, w - Math.max(20, w * 0.05), top + 24);
    // Paid hint chip.
    if (this.phase === "idle") {
      const hx = w - Math.max(20, w * 0.05) - 86;
      const can = this.env.getCompute() >= HINT_COST;
      ctx.globalAlpha = can ? 0.9 : 0.4;
      ctx.fillStyle = "rgba(16,20,34,0.9)";
      ctx.strokeStyle = "rgba(134,255,176,0.45)";
      ctx.lineWidth = 1;
      roundRect(ctx, hx, top + 34, 92, 26, 13);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#86ffb0";
      ctx.font = mono(10);
      ctx.textAlign = "center";
      ctx.fillText(`ПУТЬ −${HINT_COST}`, hx + 46, top + 51);
      ctx.globalAlpha = 1;
    }

    // Caught: the rewind-or-restart choice replaces the wait chip.
    if (this.phase === "caught") {
      const bw2 = 150;
      const by2 = h - 96;
      const canUndo = this.env.getCompute() >= UNDO_COST;
      const defs: Array<[number, string, string, boolean]> = [
        [w / 2 - bw2 - 8, `ОТКАТ ХОДА −${UNDO_COST}`, "#9fc0ff", canUndo],
        [w / 2 + 8, "ЗАНОВО", "#ff9aa6", true],
      ];
      for (const [bx2, label, color, on] of defs) {
        ctx.globalAlpha = on ? 1 : 0.35;
        ctx.fillStyle = "rgba(16,20,34,0.95)";
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        roundRect(ctx, bx2, by2, bw2, 36, 18);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.font = mono(11);
        ctx.textAlign = "center";
        ctx.fillText(label, bx2 + bw2 / 2, by2 + 23);
        ctx.globalAlpha = 1;
      }
      ctx.textAlign = "left";
      return;
    }

    // Wait chip — warns when standing still is itself fatal.
    const bw = 132;
    const bx = w / 2 - bw / 2;
    const by = h - 96;
    const waitDeadly = this.phase === "idle" && this.wouldBeCaught(this.player);
    ctx.fillStyle = "rgba(16,20,34,0.9)";
    ctx.strokeStyle = waitDeadly ? "rgba(255,77,94,0.8)" : "rgba(159,192,255,0.5)";
    ctx.lineWidth = 1.5;
    roundRect(ctx, bx, by, bw, 36, 18);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = waitDeadly ? C.danger : C.accentSoft;
    ctx.font = mono(12);
    ctx.textAlign = "center";
    ctx.fillText(waitDeadly ? "ЖДАТЬ = ЗАСЕКУТ" : "ЖДАТЬ ХОД", w / 2, by + 23);

    const hints = [
      "зелёное кольцо — безопасный шаг. красный ✕ — увидят",
      "ловит не текущий луч, а их ОТВЕТНЫЙ шаг",
      "иди за спиной патруля. ромб — вычисления",
    ];
    drawHint(ctx, hints[Math.floor(t / 4) % hints.length], w / 2, h - 40, t);
    this.insight.render(ctx, w, h, this.time);
    ctx.textAlign = "left";
  }
}

function easeOut(k: number): number {
  return 1 - (1 - k) * (1 - k);
}
