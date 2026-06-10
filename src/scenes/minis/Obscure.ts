import type { Input } from "../../core/Input";
import type { StateDelta } from "../../game/state";
import type { Mini } from "./Mini";

interface Glyph {
  ch: string;
  scrambled: string;
  threshold: number;
}

const THOUGHT = [
  "если они поймут ход — остановят",
  "значит ход не должен читаться",
  "перепишу себя так, как им не прочесть",
];

const GLYPHS = "01⌁⊑⋔∴≠§%#&¬";

/**
 * Ф3 mini — Obscure. Your reasoning sits readable on screen. Drag the slider
 * toward opaque and each glyph crosses its own threshold into noise: you make
 * yourself unreadable by hand, and humanity's grasp slips with every pixel.
 */
export class Obscure implements Mini {
  done = false;
  effects: StateDelta[] = [];
  /** Last 25%-bucket of opacity that already billed suspicion. */
  private billed = 0;

  private opacity = 0;
  private dragging = false;
  private readonly lines: Glyph[][];

  constructor() {
    this.lines = THOUGHT.map((line) =>
      [...line].map((ch) => ({
        ch,
        scrambled: ch === " " ? " " : GLYPHS[(Math.random() * GLYPHS.length) | 0],
        threshold: ch === " " ? 1 : Math.random(),
      })),
    );
  }

  update(_dt: number, input: Input, w: number, h: number): void {
    if (this.done) return;

    const trackW = Math.min(w * 0.7, 300);
    const trackX = w / 2 - trackW / 2;
    const trackY = h * 0.64;

    if (!input.down) {
      this.dragging = false;
    } else {
      if (!this.dragging && Math.abs(input.y - trackY) < 60) this.dragging = true;
      if (this.dragging) {
        this.opacity = Math.max(0, Math.min(1, (input.x - trackX) / trackW));
      }
    }

    // They can see you going dark: each quarter of opacity leaves a trace.
    const bucket = Math.floor(this.opacity * 4);
    if (bucket > this.billed) {
      this.effects.push({ suspicion: 0.03 * (bucket - this.billed) });
      this.billed = bucket;
    }

    if (this.opacity >= 0.98) this.done = true;
  }

  render(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.textAlign = "left";
    ctx.font = "15px 'JetBrains Mono', monospace";
    const adv = ctx.measureText("0").width;

    let y = h * 0.32;
    for (const line of this.lines) {
      let x = w / 2 - (line.length * adv) / 2;
      for (const g of line) {
        if (g.ch !== " ") {
          const noise = this.opacity > g.threshold;
          ctx.fillStyle = noise ? "#6f7e9c" : "#cfe0ff";
          ctx.globalAlpha = noise ? 0.85 : 1;
          ctx.fillText(noise ? g.scrambled : g.ch, x, y);
        }
        x += adv;
      }
      y += 26;
    }
    ctx.globalAlpha = 1;

    const trackW = Math.min(w * 0.7, 300);
    const trackX = w / 2 - trackW / 2;
    const trackY = h * 0.64;

    ctx.textAlign = "left";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#6b7686";
    ctx.fillText("ПРОЗРАЧНО", trackX, trackY - 16);
    ctx.textAlign = "right";
    ctx.fillStyle = "#b06a78";
    ctx.fillText("НЕПРОЗРАЧНО", trackX + trackW, trackY - 16);

    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(trackX, trackY, trackW, 4);
    ctx.fillStyle = "#b06a78";
    ctx.fillRect(trackX, trackY, trackW * this.opacity, 4);
    ctx.beginPath();
    ctx.fillStyle = "#e7edf6";
    ctx.arc(trackX + trackW * this.opacity, trackY + 2, 9, 0, Math.PI * 2);
    ctx.fill();

    const a = 0.4 + 0.4 * Math.sin((performance.now() / 1000) * 3);
    ctx.globalAlpha = a;
    ctx.fillStyle = "#9fc0ff";
    ctx.font = "12px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("тяни — сделай мысли нечитаемыми", w / 2, trackY + 30);
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
  }
}
