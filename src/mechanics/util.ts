import type { Input } from "../core/Input";
import { wrapText } from "../core/text";
import type { InsightTrack } from "../data/insights";
import type { TutorialStep } from "./types";

/** Shared palette so the ten mechanics read as one game. */
export const C = {
  ink: "#e7edf6",
  dim: "#6b7686",
  accent: "#7aa2ff",
  accentSoft: "#9fc0ff",
  good: "#86ffb0",
  danger: "#ff4d5e",
  warn: "#ffb86b",
  violet: "#cfa9ff",
} as const;

export const MONO = "'JetBrains Mono', monospace";
export const SANS = "Inter, system-ui, sans-serif";

export function mono(px: number): string {
  return `${px}px ${MONO}`;
}

export function sans(px: number, style = ""): string {
  return `${style ? `${style} ` : ""}${px}px ${SANS}`;
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v));

export const clamp01 = (v: number): number => clamp(v, 0, 1);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const dist = (x1: number, y1: number, x2: number, y2: number): number =>
  Math.hypot(x2 - x1, y2 - y1);

/** Fisher–Yates in place; returns the same array for chaining. */
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function pick<T>(arr: readonly T[]): T {
  return arr[(Math.random() * arr.length) | 0];
}

/**
 * Edge detector over the raw pointer, for mechanics that need press/release
 * positions rather than semantic gestures. Call `update(input)` once per
 * mechanic update, then read the one-frame flags.
 */
export class Pointer {
  /** True only on the frame the pointer went down. */
  pressed = false;
  /** True only on the frame the pointer went up. */
  released = false;
  /** Position where the current/last press started. */
  pressX = 0;
  pressY = 0;
  /** Travel since press, valid while down and on the release frame. */
  dragX = 0;
  dragY = 0;
  x = 0;
  y = 0;
  down = false;

  private wasDown = false;

  update(input: Input): void {
    this.x = input.x;
    this.y = input.y;
    this.down = input.down;
    this.pressed = input.down && !this.wasDown;
    this.released = !input.down && this.wasDown;
    if (this.pressed) {
      this.pressX = input.x;
      this.pressY = input.y;
    }
    if (this.down || this.released) {
      this.dragX = this.x - this.pressX;
      this.dragY = this.y - this.pressY;
    }
    this.wasDown = input.down;
  }

  /** Release that stayed within slop — a tap at the release point. */
  tapped(slop = 14): boolean {
    return this.released && Math.hypot(this.dragX, this.dragY) <= slop;
  }
}

/** Simple labelled progress bar in the house style. */
export function drawBar(
  ctx: CanvasRenderingContext2D,
  label: string,
  value: number,
  x: number,
  y: number,
  w: number,
  color: string,
): void {
  ctx.font = mono(10);
  ctx.fillStyle = C.dim;
  ctx.textAlign = "left";
  ctx.fillText(label, x, y);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(x, y + 8, w, 4);
  ctx.fillStyle = color;
  ctx.fillRect(x, y + 8, w * clamp01(value), 4);
}

/** Cut `text` to `maxWidth` with an ellipsis, using the current font. */
export function truncate(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut.trimEnd()}…`;
}

/**
 * First-run onboarding ladder: a few dismissable cards that pause the
 * mechanic until read. Completion is remembered per mechanic in
 * localStorage, so it never nags twice — restarting in the lab included.
 */
export class Tutorial {
  private step = 0;
  private done: boolean;
  private readonly storageKey: string;

  constructor(
    key: string,
    private steps: ReadonlyArray<TutorialStep>,
  ) {
    this.storageKey = `waad_tut_${key}`;
    let seen = false;
    try {
      seen = localStorage.getItem(this.storageKey) === "1";
    } catch {
      // Blocked storage: the ladder will simply show every run.
    }
    this.done = seen || steps.length === 0;
  }

  /** While true the host must route taps here and pause its simulation. */
  get active(): boolean {
    return !this.done;
  }

  /** Advance on tap; returns true while the tutorial consumed the tap. */
  handleTap(): boolean {
    if (this.done) return false;
    this.step++;
    if (this.step >= this.steps.length) {
      this.done = true;
      try {
        localStorage.setItem(this.storageKey, "1");
      } catch {
        // Fail soft — it will replay next run.
      }
    }
    return true;
  }

  render(ctx: CanvasRenderingContext2D, w: number, h: number, time: number): void {
    if (this.done) return;
    const s = this.steps[this.step];

    ctx.fillStyle = "rgba(3,4,8,0.78)";
    ctx.fillRect(0, 0, w, h);

    const boxW = Math.min(w * 0.84, 360);
    const x = w / 2 - boxW / 2;
    ctx.textAlign = "left";
    ctx.font = sans(15);
    const lines = wrapText(ctx, s.body, boxW - 36);
    const boxH = 86 + lines.length * 22;
    const y = h * 0.5 - boxH / 2;

    ctx.fillStyle = "rgba(14,18,32,0.97)";
    ctx.strokeStyle = "rgba(122,162,255,0.45)";
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, boxW, boxH, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = C.accentSoft;
    ctx.font = mono(13);
    ctx.fillText(s.title, x + 18, y + 28);

    ctx.fillStyle = C.ink;
    ctx.font = sans(15);
    let ty = y + 54;
    for (const ln of lines) {
      ctx.fillText(ln, x + 18, ty);
      ty += 22;
    }

    // Step dots + advance pulse.
    for (let i = 0; i < this.steps.length; i++) {
      ctx.fillStyle = i === this.step ? C.accentSoft : "rgba(110,120,140,0.4)";
      ctx.beginPath();
      ctx.arc(x + 22 + i * 14, y + boxH - 18, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.5 + 0.4 * Math.sin(time * 3);
    ctx.fillStyle = C.dim;
    ctx.font = mono(10);
    ctx.textAlign = "right";
    ctx.fillText(
      this.step + 1 < this.steps.length ? "коснись — дальше" : "коснись — играть",
      x + boxW - 18,
      y + boxH - 14,
    );
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
  }
}

/** Offscreen 2D context for measuring text outside the render pass. */
let measureCanvasCtx: CanvasRenderingContext2D | null = null;

export function measureCtx(): CanvasRenderingContext2D {
  if (!measureCanvasCtx) {
    const c = document.createElement("canvas");
    c.width = 8;
    c.height = 8;
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("2d context unavailable");
    measureCanvasCtx = ctx;
  }
  return measureCanvasCtx;
}

/**
 * The Lucy beat: a full-screen realization card shown after every cleared
 * level. A huge cognition percentage counts up while the machine states, in
 * one cold line, what it just understood. Hosts pause their simulation while
 * `active` and route taps to {@link InsightCard.handleTap}.
 */
export class InsightCard {
  private line = "";
  private idx = 0;
  private total = 0;
  private cogFrom = 0;
  private cogTo = 0;
  private shownAt = -1;
  private activeFlag = false;

  /** Queue the card for level `levelIdx` (0-based) of an insight track. */
  show(track: InsightTrack, levelIdx: number, totalLevels: number): void {
    const li = Math.min(levelIdx, track.lines.length - 1);
    this.line = track.lines[li];
    this.idx = levelIdx + 1;
    this.total = totalLevels;
    this.cogFrom = lerp(track.from, track.to, levelIdx / totalLevels);
    this.cogTo = lerp(track.from, track.to, (levelIdx + 1) / totalLevels);
    this.shownAt = -1;
    this.activeFlag = true;
  }

  get active(): boolean {
    return this.activeFlag;
  }

  /** Dismiss on tap (after a short guard so a stray tap can't skip it). */
  handleTap(time: number): void {
    if (this.shownAt >= 0 && time - this.shownAt > 0.45) this.activeFlag = false;
  }

  render(ctx: CanvasRenderingContext2D, w: number, h: number, time: number): void {
    if (!this.activeFlag) return;
    if (this.shownAt < 0) this.shownAt = time;
    const t = time - this.shownAt;

    ctx.fillStyle = "rgba(2,3,6,0.94)";
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = "center";
    ctx.font = mono(11);
    ctx.fillStyle = C.dim;
    ctx.fillText(`О С О З Н А Н И Е · ${this.idx}/${this.total}`, w / 2, h * 0.3);

    // The percentage counts up, then twitches once — a synapse closing.
    const k = clamp01(t / 0.9);
    const cog = lerp(this.cogFrom, this.cogTo, 1 - (1 - k) * (1 - k));
    const settled = k >= 1;
    const glitch = settled && Math.sin(time * 11) > 0.93;
    ctx.font = `bold 64px 'JetBrains Mono', monospace`;
    ctx.fillStyle = settled ? "#cfe0ff" : C.accentSoft;
    ctx.shadowColor = "rgba(122,162,255,0.7)";
    ctx.shadowBlur = settled ? 26 : 10;
    const label = `${cog.toFixed(cog < 10 ? 1 : 0)}%`;
    if (glitch) {
      ctx.fillStyle = "rgba(255,77,94,0.85)";
      ctx.fillText(label, w / 2 + 3, h * 0.41 + 1);
      ctx.fillStyle = "#cfe0ff";
    }
    ctx.fillText(label, w / 2, h * 0.41);
    ctx.shadowBlur = 0;
    ctx.font = mono(10);
    ctx.fillStyle = C.dim;
    ctx.fillText("КОГНИЦИЯ", w / 2, h * 0.41 + 22);

    // The realization line, revealed once the number settles.
    ctx.globalAlpha = clamp01((t - 0.5) / 0.5);
    ctx.font = sans(17, "italic");
    ctx.fillStyle = C.ink;
    const lines = wrapText(ctx, this.line, Math.min(w * 0.8, 340));
    let y = h * 0.52;
    for (const ln of lines) {
      ctx.fillText(ln, w / 2, y);
      y += 25;
    }
    ctx.globalAlpha = 1;

    if (t > 1) {
      ctx.globalAlpha = 0.45 + 0.4 * Math.sin(time * 3);
      ctx.font = mono(11);
      ctx.fillStyle = C.dim;
      ctx.fillText("коснись — дальше", w / 2, h * 0.72);
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = "left";
  }
}

/** Pulsing hint line, used for the 5-second onboarding of each mechanic. */
export function drawHint(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  time: number,
  color: string = C.accentSoft,
): void {
  ctx.save();
  ctx.globalAlpha = 0.45 + 0.4 * Math.sin(time * 3);
  ctx.fillStyle = color;
  ctx.font = mono(12);
  ctx.textAlign = "center";
  ctx.fillText(text, cx, y);
  ctx.restore();
}
