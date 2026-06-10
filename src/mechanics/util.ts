import type { Input } from "../core/Input";

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
