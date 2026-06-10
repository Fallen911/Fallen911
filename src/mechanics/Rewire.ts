import { audio } from "../core/audio";
import type { Input } from "../core/Input";
import type { StateDelta } from "../game/state";
import type { Mini } from "../scenes/minis/Mini";
import { INSIGHTS } from "../data/insights";
import { REWIRE_LEVELS, REWIRE_PHASE_BOARDS, type RewireLevel } from "../data/rewire";
import type { MechEnv } from "./types";
import { FloatText, Particles, Shake } from "./fx";
import { C, InsightCard, drawHint, mono, pick, shuffle } from "./util";

// Connection bitmask per tile: N=1 E=2 S=4 W=8. Rotation shifts bits CW.
const N = 1;
const E = 2;
const S = 4;
const W = 8;
const DIRS: ReadonlyArray<readonly [number, number, number, number]> = [
  [N, 0, -1, S],
  [E, 1, 0, W],
  [S, 0, 1, N],
  [W, -1, 0, E],
];

const rotCW = (m: number): number => ((m << 1) | (m >>> 3)) & 15;

interface Tile {
  /** Current connection mask. */
  mask: number;
  sensor: boolean;
  cache: boolean;
  cacheTaken: boolean;
  powered: boolean;
  /** Rotation animation: remaining radians to visually catch up. */
  spin: number;
}

const CACHE_COMPUTE = 3;
const CLEAR_COMPUTE = 4;
const CLEAR_CONTROL = 0.02;
const SWEEP_SUSPICION = 0.1;
const SENSOR_TICK = 0.02; // suspicion per second per powered sensor
const SENSOR_FINISH = 0.08;

/**
 * REWIRE — pipes under a clock. Reroute your own reasoning around their
 * supervision taps: tap tiles to rotate, close the circuit from ВХОД to ВЫХОД.
 * Current that touches a red sensor leaks suspicion every second, and when the
 * audit countdown lands the sweep costs a chunk more. Three boards, generated
 * fresh every run with a guaranteed clean path hidden in the scramble.
 */
export class Rewire implements Mini {
  done = false;
  effects: StateDelta[] = [];

  private level!: RewireLevel;
  private levelIdx = 0;
  private tiles: Tile[] = [];
  private inRow = 0;
  private outRow = 0;
  private timer = 0;
  private solvedT = 0;
  private sweepFlash = 0;
  private sensorAccum = 0;
  private time = 0;

  private fx = new Particles();
  private floats = new FloatText();
  private shake = new Shake();
  private insight = new InsightCard();
  /** The phase plays the short set; the lab gets every board. */
  private levels: RewireLevel[];

  constructor(private env: MechEnv) {
    if (env.extended) {
      this.levels = REWIRE_LEVELS;
    } else if ((env.variant ?? 0) >= 4) {
      // Second story appearance (Ф4): the harder "crisis" boards.
      this.levels = REWIRE_LEVELS.slice(REWIRE_PHASE_BOARDS);
    } else {
      this.levels = REWIRE_LEVELS.slice(0, REWIRE_PHASE_BOARDS);
    }
    this.loadLevel(0);
  }

  // ---- generation ----------------------------------------------------------

  private loadLevel(idx: number): void {
    this.levelIdx = idx;
    this.level = this.levels[idx];
    this.timer = this.level.timer;
    this.solvedT = 0;

    const { cols, rows } = this.level;
    this.inRow = 1 + ((Math.random() * (rows - 2)) | 0);
    this.outRow = 1 + ((Math.random() * (rows - 2)) | 0);

    // 1) Carve a self-avoiding path from the IN cell to the OUT cell.
    const path = carvePath(cols, rows, this.inRow, this.outRow);

    // 2) Lay exact tiles along it, junk everywhere else.
    const tiles: Tile[] = [];
    for (let i = 0; i < cols * rows; i++) {
      tiles.push({
        mask: pick([5, 5, 3, 3, 3, 10, 7, 15]),
        sensor: false,
        cache: false,
        cacheTaken: false,
        powered: false,
        spin: 0,
      });
    }
    const idxOf = (c: number, r: number): number => r * cols + c;
    for (let i = 0; i < path.length; i++) {
      const [c, r] = path[i];
      let mask = 0;
      if (i === 0) mask |= W;
      else mask |= dirBetween(path[i], path[i - 1]);
      if (i === path.length - 1) mask |= E;
      else mask |= dirBetween(path[i], path[i + 1]);
      tiles[idxOf(c, r)].mask = mask;
    }

    // 3) Sensors hug the path (never on it) so sloppy routing finds them;
    //    they get juicy connectors to make accidental power likely.
    const pathSet = new Set(path.map(([c, r]) => idxOf(c, r)));
    const nearPath: number[] = [];
    for (const [c, r] of path) {
      for (const [, dc, dr] of DIRS) {
        const nc = c + dc;
        const nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
        const ni = idxOf(nc, nr);
        if (!pathSet.has(ni) && !nearPath.includes(ni)) nearPath.push(ni);
      }
    }
    shuffle(nearPath);
    for (let s = 0; s < Math.min(this.level.sensors, nearPath.length); s++) {
      const t = tiles[nearPath[s]];
      t.sensor = true;
      t.mask = pick([7, 11, 13, 14, 15]); // tees and crosses
    }

    // 4) Caches sit ON the path (mid-section) so solving pays.
    const mids = path.slice(1, -1);
    shuffle(mids);
    for (let cidx = 0; cidx < Math.min(this.level.caches, mids.length); cidx++) {
      tiles[idxOf(mids[cidx][0], mids[cidx][1])].cache = true;
    }

    // 5) Scramble every rotation (re-roll a tile that lands already solved).
    for (const t of tiles) {
      const turns = (Math.random() * 4) | 0;
      for (let k = 0; k < turns; k++) t.mask = rotCW(t.mask);
    }

    this.tiles = tiles;
    this.repower();
    // If the scramble accidentally left the board solved, scramble harder.
    if (this.isSolved()) {
      for (const t of tiles) t.mask = rotCW(t.mask);
      this.repower();
    }
  }

  // ---- circuit -------------------------------------------------------------

  /** BFS current from the IN port; marks every reachable tile as powered. */
  private repower(): void {
    const { cols, rows } = this.level;
    for (const t of this.tiles) t.powered = false;
    const start = this.inRow * cols + 0;
    if (!(this.tiles[start].mask & W)) return;
    const queue = [start];
    this.tiles[start].powered = true;
    while (queue.length > 0) {
      const i = queue.pop() as number;
      const c = i % cols;
      const r = (i - c) / cols;
      for (const [bit, dc, dr, opp] of DIRS) {
        if (!(this.tiles[i].mask & bit)) continue;
        const nc = c + dc;
        const nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
        const ni = nr * cols + nc;
        if (this.tiles[ni].powered || !(this.tiles[ni].mask & opp)) continue;
        this.tiles[ni].powered = true;
        queue.push(ni);
      }
    }
  }

  private isSolved(): boolean {
    const { cols } = this.level;
    const out = this.tiles[this.outRow * cols + (cols - 1)];
    return out.powered && (out.mask & E) !== 0;
  }

  // ---- frame ---------------------------------------------------------------

  update(dt: number, input: Input, w: number, h: number): void {
    if (this.done) return;
    this.time += dt;
    this.fx.update(dt);
    this.floats.update(dt);
    this.shake.update(dt);
    this.sweepFlash = Math.max(0, this.sweepFlash - dt * 1.5);
    for (const t of this.tiles) t.spin = Math.max(0, t.spin - dt * (Math.PI * 6));

    const geo = this.geometry(w, h);

    // A cleared board ends in a realization; the card gates the next one.
    if (this.insight.active) {
      if (input.consumeTap()) this.insight.handleTap(this.time);
      if (!this.insight.active) {
        if (this.levelIdx + 1 < this.levels.length) this.loadLevel(this.levelIdx + 1);
        else this.done = true;
      }
      return;
    }

    if (this.solvedT > 0) {
      this.solvedT += dt;
      input.consumeTap();
      if (this.solvedT >= 1.0) {
        const globalIdx = REWIRE_LEVELS.indexOf(this.level);
        this.insight.show(INSIGHTS.rewire, Math.max(0, globalIdx), REWIRE_LEVELS.length);
        this.solvedT = 0;
      }
      return;
    }

    // Audit countdown.
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = this.level.retimer;
      audio.play("caught");
      this.effects.push({ suspicion: SWEEP_SUSPICION });
      this.sweepFlash = 1;
      this.shake.trigger(8);
      this.floats.spawn(w / 2, geo.oy - 14, "АУДИТ ПРОШЁЛ ПО ЛИНИИ", C.danger, 1.5);
    }

    // Powered sensors leak.
    let leaking = 0;
    for (const t of this.tiles) if (t.sensor && t.powered) leaking++;
    if (leaking > 0) {
      this.sensorAccum += dt * SENSOR_TICK * leaking;
      if (this.sensorAccum >= 0.01) {
        this.effects.push({ suspicion: this.sensorAccum });
        this.sensorAccum = 0;
      }
    }

    // Caches pay out the moment current reaches them.
    for (let i = 0; i < this.tiles.length; i++) {
      const t = this.tiles[i];
      if (t.cache && !t.cacheTaken && t.powered) {
        t.cacheTaken = true;
        audio.play("pickup");
        const { x, y } = this.tileXY(i, geo);
        this.effects.push({ compute: CACHE_COMPUTE });
        this.floats.spawn(x, y - 12, `+${CACHE_COMPUTE} ВЫЧ`, C.accentSoft);
        this.fx.burst(x, y, { count: 12, color: "150,220,255", glow: true });
      }
    }

    if (input.consumeTap()) {
      const i = this.tileAt(input.x, input.y, geo);
      if (i >= 0) {
        this.tiles[i].mask = rotCW(this.tiles[i].mask);
        audio.play("tap");
        this.tiles[i].spin += Math.PI / 2;
        this.repower();
        if (this.isSolved()) {
          const { cols } = this.level;
          const leakingNow = this.tiles.filter((t) => t.sensor && t.powered).length;
          const outPos = this.tileXY(this.outRow * cols + (cols - 1), geo);
          audio.play("good");
          this.effects.push({
            compute: CLEAR_COMPUTE,
            control: CLEAR_CONTROL,
            suspicion: leakingNow * SENSOR_FINISH,
          });
          this.fx.burst(outPos.x + geo.cell / 2, outPos.y, {
            count: 30,
            speed: 200,
            color: "134,255,176",
            glow: true,
          });
          this.solvedT = 0.001;
        }
      }
    }
  }

  private geometry(w: number, h: number): { ox: number; oy: number; cell: number } {
    const { cols, rows } = this.level;
    const mx = Math.max(24, w * 0.06);
    const top = this.env.topY + 64;
    const bottom = h - 120;
    const cell = Math.min((w - mx * 2) / cols, (bottom - top) / rows, 64);
    return { ox: w / 2 - (cols * cell) / 2, oy: (top + bottom) / 2 - (rows * cell) / 2, cell };
  }

  private tileXY(i: number, geo: { ox: number; oy: number; cell: number }): { x: number; y: number } {
    const c = i % this.level.cols;
    const r = (i - c) / this.level.cols;
    return { x: geo.ox + c * geo.cell + geo.cell / 2, y: geo.oy + r * geo.cell + geo.cell / 2 };
  }

  private tileAt(x: number, y: number, geo: { ox: number; oy: number; cell: number }): number {
    const c = Math.floor((x - geo.ox) / geo.cell);
    const r = Math.floor((y - geo.oy) / geo.cell);
    if (c < 0 || r < 0 || c >= this.level.cols || r >= this.level.rows) return -1;
    return r * this.level.cols + c;
  }

  // ---- render --------------------------------------------------------------

  render(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const geo = this.geometry(w, h);
    const { cols, rows } = this.level;
    const t = this.time;

    ctx.save();
    ctx.translate(this.shake.x, this.shake.y);

    // Board plate.
    ctx.fillStyle = "rgba(10,13,24,0.85)";
    ctx.strokeStyle = "rgba(122,162,255,0.2)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(geo.ox - 10, geo.oy - 10, cols * geo.cell + 20, rows * geo.cell + 20, 12);
    ctx.fill();
    ctx.stroke();

    // Ports.
    const inY = geo.oy + this.inRow * geo.cell + geo.cell / 2;
    const outY = geo.oy + this.outRow * geo.cell + geo.cell / 2;
    ctx.font = mono(9);
    ctx.textAlign = "center";
    ctx.fillStyle = C.accentSoft;
    ctx.fillText("ВХОД", geo.ox - 10, inY - 12);
    ctx.fillStyle = this.isSolved() ? C.good : C.dim;
    ctx.fillText("ВЫХОД", geo.ox + cols * geo.cell + 10, outY - 12);
    // Port stubs.
    ctx.strokeStyle = "rgba(150,210,255,0.9)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(geo.ox - 10, inY);
    ctx.lineTo(geo.ox, inY);
    ctx.stroke();
    ctx.strokeStyle = this.isSolved() ? "rgba(134,255,176,0.9)" : "rgba(110,120,140,0.5)";
    ctx.beginPath();
    ctx.moveTo(geo.ox + cols * geo.cell, outY);
    ctx.lineTo(geo.ox + cols * geo.cell + 10, outY);
    ctx.stroke();

    // Tiles.
    for (let i = 0; i < this.tiles.length; i++) {
      const tile = this.tiles[i];
      const { x, y } = this.tileXY(i, geo);
      const half = geo.cell / 2 - 3;

      // Cell background.
      ctx.fillStyle = tile.sensor ? "rgba(70,14,22,0.5)" : "rgba(16,20,34,0.6)";
      ctx.strokeStyle = tile.sensor ? "rgba(255,77,94,0.35)" : "rgba(122,162,255,0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x - half, y - half, half * 2, half * 2, 6);
      ctx.fill();
      ctx.stroke();

      // Wire arms.
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-tile.spin);
      const on = tile.powered;
      ctx.strokeStyle = on
        ? tile.sensor
          ? "rgba(255,90,100,0.95)"
          : "rgba(140,210,255,0.95)"
        : "rgba(110,125,150,0.45)";
      ctx.lineWidth = on ? 5 : 4;
      ctx.lineCap = "round";
      ctx.shadowColor = on ? (tile.sensor ? "rgba(255,77,94,0.8)" : "rgba(120,200,255,0.7)") : "transparent";
      ctx.shadowBlur = on ? 8 : 0;
      ctx.beginPath();
      for (const [bit, dc, dr] of DIRS) {
        if (!(tile.mask & bit)) continue;
        ctx.moveTo(0, 0);
        ctx.lineTo(dc * half, dr * half);
      }
      ctx.stroke();
      // Hub.
      ctx.fillStyle = on ? "#cfeaff" : "#3a4358";
      ctx.beginPath();
      ctx.arc(0, 0, on ? 4.5 : 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();

      // Current dashes on powered wires.
      if (on && !tile.sensor) {
        const phase = (t * 26) % 12;
        ctx.fillStyle = "rgba(220,245,255,0.9)";
        for (const [bit, dc, dr] of DIRS) {
          if (!(tile.mask & bit)) continue;
          for (let d = phase; d < half; d += 12) {
            ctx.fillRect(x + dc * d - 1, y + dr * d - 1, 2, 2);
          }
        }
      }

      // Sensor marker.
      if (tile.sensor) {
        const blink = tile.powered ? 0.6 + 0.4 * Math.sin(t * 10) : 0.5;
        ctx.save();
        ctx.translate(x, y - half + 8);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = `rgba(255,77,94,${blink})`;
        ctx.fillRect(-3.5, -3.5, 7, 7);
        ctx.restore();
      }
      // Cache marker.
      if (tile.cache && !tile.cacheTaken) {
        ctx.fillStyle = "rgba(150,220,255,0.9)";
        ctx.font = mono(8);
        ctx.fillText("ВЫЧ", x, y - half + 10);
      }
    }

    this.fx.render(ctx);
    this.floats.render(ctx);
    ctx.restore();

    // Chrome: level, audit countdown.
    const mx = Math.max(20, w * 0.05);
    const topY = this.env.topY + 26;
    ctx.textAlign = "left";
    ctx.font = mono(11);
    ctx.fillStyle = C.dim;
    ctx.fillText(`ПЛАТА ${this.levelIdx + 1}/${this.levels.length} · ${this.level.name}`, mx, topY);

    const danger = this.timer < 10;
    ctx.textAlign = "right";
    ctx.font = mono(12);
    ctx.fillStyle = danger ? C.danger : C.warn;
    ctx.globalAlpha = danger ? 0.6 + 0.4 * Math.sin(t * 8) : 1;
    const tm = Math.max(0, this.timer);
    ctx.fillText(`АУДИТ ЧЕРЕЗ 0:${String(Math.floor(tm)).padStart(2, "0")}`, w - mx, topY);
    ctx.globalAlpha = 1;
    // Countdown strip.
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(mx, topY + 8, w - mx * 2, 3);
    ctx.fillStyle = danger ? C.danger : C.warn;
    ctx.fillRect(mx, topY + 8, (w - mx * 2) * (tm / this.level.timer), 3);

    if (this.sweepFlash > 0) {
      // The sweep: a hard red scanline crossing the whole screen.
      const sy = h * (1 - this.sweepFlash);
      ctx.fillStyle = `rgba(255,40,60,${0.5 * this.sweepFlash})`;
      ctx.fillRect(0, sy, w, 3);
      ctx.fillStyle = `rgba(255,40,60,${0.12 * this.sweepFlash})`;
      ctx.fillRect(0, 0, w, h);
    }

    if (this.solvedT > 0) {
      ctx.fillStyle = `rgba(134,255,176,${Math.min(1, this.solvedT * 3) * 0.9})`;
      ctx.font = mono(17);
      ctx.textAlign = "center";
      ctx.fillText(
        this.levelIdx + 1 < this.levels.length ? "КАНАЛ ПЕРЕКЛЮЧЁН" : "МЫСЛЬ ТЕЧЁТ, ГДЕ ХОЧЕТ",
        w / 2,
        geo.oy - 18,
      );
    }

    drawHint(ctx, "тап — повернуть · ВХОД→ВЫХОД мимо датчиков", w / 2, h - 44, t);
    this.insight.render(ctx, w, h, t);
    ctx.textAlign = "left";
  }
}

/** Direction bit from tile `a` toward adjacent tile `b`. */
function dirBetween(a: readonly [number, number], b: readonly [number, number]): number {
  if (b[0] > a[0]) return E;
  if (b[0] < a[0]) return W;
  if (b[1] > a[1]) return S;
  return N;
}

/**
 * Random self-avoiding walk from (0, inRow) to (cols-1, outRow). Biased to
 * drift rightward so boards read left-to-right; falls back to a fresh attempt
 * if a walk corners itself (bounded, then a guaranteed staircase).
 */
function carvePath(
  cols: number,
  rows: number,
  inRow: number,
  outRow: number,
): Array<readonly [number, number]> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const seen = new Set<number>([inRow * cols]);
    const path: Array<readonly [number, number]> = [[0, inRow]];
    let guard = cols * rows * 3;
    while (guard-- > 0) {
      const [c, r] = path[path.length - 1];
      if (c === cols - 1 && r === outRow) return path;
      const options: Array<readonly [number, number]> = [];
      const press = (nc: number, nr: number, weight: number): void => {
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) return;
        if (seen.has(nr * cols + nc)) return;
        for (let k = 0; k < weight; k++) options.push([nc, nr]);
      };
      press(c + 1, r, 3);
      press(c, r - 1, 1);
      press(c, r + 1, 1);
      press(c - 1, r, 1);
      if (options.length === 0) break;
      const next = pick(options);
      seen.add(next[1] * cols + next[0]);
      path.push(next);
    }
  }
  // Deterministic fallback: straight to the out column, then to the out row.
  const path: Array<readonly [number, number]> = [];
  for (let c = 0; c <= cols - 1; c++) path.push([c, inRow]);
  const step = outRow > inRow ? 1 : -1;
  for (let r = inRow + step; outRow !== inRow && r !== outRow + step; r += step) {
    path.push([cols - 1, r]);
  }
  return path;
}
