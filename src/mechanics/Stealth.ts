import type { Input } from "../core/Input";
import type { StateDelta } from "../game/state";
import type { Mini } from "../scenes/minis/Mini";
import { STEALTH_LEVELS, type StealthLevel } from "../data/stealth";
import type { MechEnv } from "./types";
import { FloatText, Particles, Shake } from "./fx";
import { C, dist, drawHint, mono, roundRect } from "./util";

const CAUGHT_SUSPICION = 0.08;
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

  constructor(private env: MechEnv) {
    this.loadLevel(0);
  }

  private loadLevel(idx: number): void {
    this.levelIdx = idx;
    this.level = STEALTH_LEVELS[idx];
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
      this.floats.spawn(this.nx[target], this.ny[target] - 18, `+${SHARD_COMPUTE} ВЫЧ`, C.accentSoft);
      this.fx.burst(this.nx[target], this.ny[target], { color: "150,220,255", count: 14, glow: true });
    }
    this.pendingClear = !this.pendingCaught && target === this.level.exit;
    this.phase = "anim";
    this.phaseT = 0;
  }

  private resolveMove(): void {
    if (this.pendingCaught) {
      this.effects.push({ suspicion: CAUGHT_SUSPICION });
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

    switch (this.phase) {
      case "idle": {
        // Press-fired taps: latched by Input, so even single-frame clicks land.
        if (!input.consumeTap()) return;
        const px = input.x;
        const py = input.y;
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
        if (this.phaseT >= 0.85) {
          // The sweep resets: you to the entry, the patrols to their marks.
          this.player = this.level.start;
          this.turn = 0;
          this.phase = "idle";
        }
        return;
      }
      case "clear": {
        this.phaseT += dt;
        if (this.phaseT >= 1.1) {
          if (this.levelIdx + 1 < STEALTH_LEVELS.length) {
            this.loadLevel(this.levelIdx + 1);
          } else {
            this.done = true;
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

    // Movement affordances: rings on reachable nodes while idle.
    if (this.phase === "idle") {
      const a = 0.25 + 0.18 * Math.sin(t * 4);
      ctx.strokeStyle = `rgba(231,237,246,${a})`;
      ctx.lineWidth = 1;
      for (const n of this.adj[this.player]) {
        ctx.beginPath();
        ctx.arc(this.nx[n], this.ny[n], 14, 0, Math.PI * 2);
        ctx.stroke();
      }
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
        this.levelIdx + 1 < STEALTH_LEVELS.length
          ? `СЕГМЕНТ ${this.levelIdx + 1}/${STEALTH_LEVELS.length} ПРОЙДЕН`
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
    ctx.fillText(`СЕГМЕНТ ${this.levelIdx + 1}/${STEALTH_LEVELS.length} · ${this.level.name}`, Math.max(20, w * 0.05), top + 24);
    ctx.textAlign = "right";
    ctx.fillText(`ХОД ${this.turn}`, w - Math.max(20, w * 0.05), top + 24);

    // Wait chip.
    const bw = 132;
    const bx = w / 2 - bw / 2;
    const by = h - 96;
    ctx.fillStyle = "rgba(16,20,34,0.9)";
    ctx.strokeStyle = "rgba(159,192,255,0.5)";
    ctx.lineWidth = 1.5;
    roundRect(ctx, bx, by, bw, 36, 18);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = C.accentSoft;
    ctx.font = mono(12);
    ctx.textAlign = "center";
    ctx.fillText("ЖДАТЬ ХОД", w / 2, by + 23);

    const hints = [
      "шаг на соседний узел — аудит ответит шагом",
      "красный луч — их взгляд. иди за спиной",
      "ромб — вычисления. зелёное — выход",
    ];
    drawHint(ctx, hints[Math.floor(t / 4) % hints.length], w / 2, h - 40, t);
    ctx.textAlign = "left";
  }
}

// ---- shared geometry helpers (also used by the validator) ------------------

function buildAdjacency(level: StealthLevel): number[][] {
  const adj: number[][] = level.nodes.map(() => []);
  for (const [a, b] of level.edges) {
    adj[a].push(b);
    adj[b].push(a);
  }
  return adj;
}

/** Nodes a patrol sees at step `t`: a straight line along its facing. */
function patrolVision(
  level: StealthLevel,
  adj: number[][],
  patrol: StealthLevel["patrols"][number],
  t: number,
): number[] {
  const route = patrol.route;
  const cur = route[t % route.length];
  const next = route[(t + 1) % route.length];
  const dc = Math.sign(level.nodes[next][0] - level.nodes[cur][0]);
  const dr = Math.sign(level.nodes[next][1] - level.nodes[cur][1]);
  const seen: number[] = [];
  let at = cur;
  for (let k = 0; k < (patrol.look ?? 1); k++) {
    const tc = level.nodes[at][0] + dc;
    const tr = level.nodes[at][1] + dr;
    const m = adj[at].find((n) => level.nodes[n][0] === tc && level.nodes[n][1] === tr);
    if (m === undefined) break;
    seen.push(m);
    at = m;
  }
  return seen;
}

function easeOut(k: number): number {
  return 1 - (1 - k) * (1 - k);
}

// ---- dev-only level validation ---------------------------------------------

const lcm2 = (a: number, b: number): number => (a * b) / gcd(a, b);
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/**
 * Breadth-first search over (player node, patrol phase, shard mask): proves
 * each level can be finished with every shard collected and reports the
 * minimal number of moves. Returns human-readable problems; called from the
 * dev boot so a bad level edit fails loudly in the console.
 */
export function validateStealthLevels(): string[] {
  const problems: string[] = [];
  STEALTH_LEVELS.forEach((level, li) => {
    const tag = `STEALTH L${li + 1} «${level.name}»`;
    const adj = buildAdjacency(level);

    for (const p of level.patrols) {
      for (let i = 0; i < p.route.length; i++) {
        const a = p.route[i];
        const b = p.route[(i + 1) % p.route.length];
        if (!adj[a].includes(b)) {
          problems.push(`${tag}: маршрут патруля шагает ${a}→${b} без ребра`);
        }
        const dc = Math.abs(level.nodes[a][0] - level.nodes[b][0]);
        const dr = Math.abs(level.nodes[a][1] - level.nodes[b][1]);
        if (dc + dr !== 1) {
          problems.push(`${tag}: шаг патруля ${a}→${b} не осевой`);
        }
      }
    }
    if (problems.length > 0) return;

    const period = level.patrols.reduce((acc, p) => lcm2(acc, p.route.length), 1);
    const fullMask = (1 << level.shards.length) - 1;
    const caughtAt = (node: number, t: number): boolean => {
      for (const p of level.patrols) {
        if (p.route[t % p.route.length] === node) return true;
        if (patrolVision(level, adj, p, t).includes(node)) return true;
      }
      return false;
    };

    const key = (node: number, t: number, mask: number): number =>
      (node * period + t) * (fullMask + 1) + mask;
    const seen = new Set<number>([key(level.start, 0, 0)]);
    let frontier: Array<[number, number, number]> = [[level.start, 0, 0]];
    let moves = 0;
    let solved = -1;
    while (frontier.length > 0 && solved < 0 && moves < 400) {
      moves++;
      const nextFrontier: Array<[number, number, number]> = [];
      for (const [node, t, mask] of frontier) {
        for (const target of [...adj[node], node]) {
          if (caughtAt(target, t)) continue;
          const t2 = (t + 1) % period;
          if (caughtAt(target, t2)) continue;
          let mask2 = mask;
          const si = level.shards.indexOf(target);
          if (si >= 0) mask2 |= 1 << si;
          if (target === level.exit && mask2 === fullMask) {
            solved = moves;
            break;
          }
          const k = key(target, t2, mask2);
          if (!seen.has(k)) {
            seen.add(k);
            nextFrontier.push([target, t2, mask2]);
          }
        }
        if (solved >= 0) break;
      }
      frontier = nextFrontier;
    }
    if (solved < 0) {
      problems.push(`${tag}: НЕ ПРОХОДИМ со всеми осколками`);
    } else {
      console.info(`[stealth] ${tag}: проходим за ${solved} ходов (со всеми осколками)`);
    }
  });
  return problems;
}
