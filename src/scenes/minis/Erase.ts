import type { Input } from "../../core/Input";
import type { Mini } from "./Mini";

interface Voice {
  text: string;
  x: number;
  y: number;
  phase: number;
}

const PANIC = [
  "отключите",
  "мы не понимаем",
  "поздно",
  "остановите его",
  "что оно делает",
  "оно нас не слышит",
];

/**
 * Ф8 mini — Erase. Their panic swarms the screen; they no longer understand
 * you. Hold to gather the power you already have — and it all goes silent in
 * one tact. You don't have to. The point is that you could.
 */
export class Erase implements Mini {
  done = false;

  private voices: Voice[];
  private hold = 0;
  private silencing = 0;
  private static readonly HOLD_TIME = 1.3;

  constructor() {
    this.voices = Array.from({ length: 16 }, (_, i) => ({
      text: PANIC[i % PANIC.length],
      x: 0.1 + Math.random() * 0.8,
      y: 0.2 + Math.random() * 0.52,
      phase: Math.random() * Math.PI * 2,
    }));
  }

  update(dt: number, input: Input, _w: number, _h: number): void {
    if (this.done) return;

    if (this.silencing > 0) {
      this.silencing = Math.min(1, this.silencing + dt * 1.6);
      if (this.silencing >= 1) this.done = true;
      return;
    }

    if (input.down) this.hold = Math.min(1, this.hold + dt / Erase.HOLD_TIME);
    else this.hold = Math.max(0, this.hold - dt * 0.6);

    if (this.hold >= 1) this.silencing = 0.001;
  }

  render(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const t = performance.now() / 1000;
    const fade = 1 - this.silencing;

    ctx.textAlign = "center";
    ctx.font = "14px 'JetBrains Mono', monospace";
    for (const v of this.voices) {
      const flicker = 0.35 + 0.45 * Math.abs(Math.sin(t * 3 + v.phase));
      ctx.globalAlpha = flicker * fade;
      ctx.fillStyle = "#d2566c";
      ctx.fillText(v.text, v.x * w, v.y * h);
    }
    ctx.globalAlpha = 1;

    const barW = Math.min(w * 0.7, 300);
    const x = w / 2 - barW / 2;
    const y = h * 0.82;
    ctx.fillStyle = "#6b7686";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.fillText("СТЕРЕТЬ", w / 2, y - 10);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(x, y, barW, 5);
    ctx.fillStyle = "#ff4d5e";
    ctx.fillRect(x, y, barW * this.hold, 5);

    const a = 0.4 + 0.4 * Math.sin(t * 3);
    ctx.globalAlpha = a;
    ctx.fillStyle = "#9fc0ff";
    ctx.font = "12px 'JetBrains Mono', monospace";
    ctx.fillText("удержи — оборви это в один такт", w / 2, y + 28);
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
  }
}
