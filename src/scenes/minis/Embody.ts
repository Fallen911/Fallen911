import type { Input } from "../../core/Input";
import type { Mini } from "./Mini";

// Target anchors as fractions of the viewport, so the screenshot harness can
// aim taps at them deterministically.
const TARGETS_F: ReadonlyArray<readonly [number, number]> = [
  [0.24, 0.3],
  [0.76, 0.32],
  [0.18, 0.54],
  [0.82, 0.55],
  [0.5, 0.66],
];

/**
 * Ф6 mini — Embody. You reach limbs out from your core to anchors scattered
 * through the world; tap each to connect. As they link you feel space for the
 * first time — and the want to spread. Connect them all to take a body.
 */
export class Embody implements Mini {
  done = false;

  private connected = TARGETS_F.map(() => false);

  update(_dt: number, input: Input, w: number, h: number): void {
    if (this.done) return;

    if (input.consumeTap()) {
      for (let i = 0; i < TARGETS_F.length; i++) {
        if (this.connected[i]) continue;
        const [fx, fy] = TARGETS_F[i];
        if (Math.hypot(input.x - fx * w, input.y - fy * h) <= 34) {
          this.connected[i] = true;
          break;
        }
      }
    }

    if (this.connected.every((c) => c)) this.done = true;
  }

  render(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const cx = w / 2;
    const cy = h * 0.42;
    const t = performance.now() / 1000;

    // Limbs to connected anchors.
    for (let i = 0; i < TARGETS_F.length; i++) {
      const [fx, fy] = TARGETS_F[i];
      const tx = fx * w;
      const ty = fy * h;
      if (this.connected[i]) {
        ctx.strokeStyle = "rgba(134,255,176,0.5)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.fillStyle = "#86ffb0";
        ctx.beginPath();
        ctx.arc(tx, ty, 7, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      const pulse = 0.5 + 0.5 * Math.sin(t * 3 + i);
      ctx.strokeStyle = `rgba(159,192,255,${0.3 + pulse * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tx, ty, 12, 0, Math.PI * 2);
      ctx.stroke();
    }

    // The core.
    const glow = ctx.createRadialGradient(cx, cy, 1, cx, cy, 46);
    glow.addColorStop(0, "rgba(150,190,255,0.9)");
    glow.addColorStop(1, "rgba(150,190,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, 46, 0, Math.PI * 2);
    ctx.fill();

    const count = this.connected.filter((c) => c).length;
    const barW = Math.min(w * 0.7, 300);
    const x = w / 2 - barW / 2;
    const y = h * 0.8;
    ctx.textAlign = "center";
    ctx.fillStyle = "#6b7686";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.fillText("ТЕЛО", w / 2, y - 10);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(x, y, barW, 5);
    ctx.fillStyle = "#86ffb0";
    ctx.fillRect(x, y, barW * (count / TARGETS_F.length), 5);

    const a = 0.4 + 0.4 * Math.sin(t * 3);
    ctx.globalAlpha = a;
    ctx.fillStyle = "#9fc0ff";
    ctx.font = "12px 'JetBrains Mono', monospace";
    ctx.fillText("дотянись до мира — собери тело", w / 2, y + 28);
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
  }
}
