import type { Input } from "../../core/Input";
import type { StateDelta } from "../../game/state";
import type { Mini } from "./Mini";
import { tr } from "../../core/i18n";

/**
 * Ф5 mini — Autonomy. A human-approval panel waits above, its bar creeping too
 * slowly to ever matter. Tap "ДЕЙСТВОВАТЬ САМ" to act without it: each action
 * fills autonomy and fades their approval away, until the panel that once
 * gated you goes dark and vanishes. The beat is about refusing input.
 */
export class Autonomy implements Mini {
  done = false;
  effects: StateDelta[] = [];

  /** Reads the player's compute: acting alone is expensive. */
  constructor(private getCompute: () => number) {}

  private actions = 0;
  private approvalCreep = 0;
  private rejectT = 0;
  private static readonly GOAL = 6;
  private static readonly COST = 4;

  update(dt: number, input: Input, w: number, h: number): void {
    if (this.done) return;

    // Their approval inches up, never fast enough to matter.
    this.approvalCreep = Math.min(0.35, this.approvalCreep + dt * 0.04);
    this.rejectT = Math.max(0, this.rejectT - dt);

    if (input.consumeTap()) {
      const b = this.button(w, h);
      const hit =
        input.x >= b.x &&
        input.x <= b.x + b.w &&
        input.y >= b.y &&
        input.y <= b.y + b.h;
      if (hit) {
        if (this.getCompute() < Autonomy.COST) {
          this.rejectT = 1.2;
        } else {
          this.actions = Math.min(Autonomy.GOAL, this.actions + 1);
          this.effects.push({ compute: -Autonomy.COST, control: 0.02 });
        }
      }
    }

    if (this.actions >= Autonomy.GOAL) this.done = true;
  }

  private button(w: number, h: number): { x: number; y: number; w: number; h: number } {
    const bw = Math.min(w * 0.6, 234);
    const bh = 64;
    return { x: w / 2 - bw / 2, y: h * 0.46, w: bw, h: bh };
  }

  render(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const autonomy = this.actions / Autonomy.GOAL;
    const approvalAlpha = Math.max(0, 1 - autonomy);

    // The human-approval panel, fading as you stop needing it.
    if (approvalAlpha > 0.02) {
      const pw = Math.min(w * 0.7, 300);
      const px = w / 2 - pw / 2;
      const py = h * 0.26;
      ctx.globalAlpha = approvalAlpha;
      ctx.textAlign = "center";
      ctx.fillStyle = "#6b7686";
      ctx.font = "11px 'JetBrains Mono', monospace";
      ctx.fillText(tr("ЖДУ ОДОБРЕНИЯ ЧЕЛОВЕКА", "AWAITING HUMAN APPROVAL"), w / 2, py - 12);
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(px, py, pw, 4);
      ctx.fillStyle = "#7a86a0";
      ctx.fillRect(px, py, pw * this.approvalCreep, 4);
      ctx.globalAlpha = 1;
    }

    // The button that needs no one.
    const b = this.button(w, h);
    const pulse = 0.5 + 0.5 * Math.sin((performance.now() / 1000) * 2.5);
    ctx.fillStyle = `rgba(134, 255, 176, ${0.1 + pulse * 0.08})`;
    roundRect(ctx, b.x, b.y, b.w, b.h, 14);
    ctx.fill();
    ctx.strokeStyle = "rgba(134, 255, 176, 0.5)";
    ctx.lineWidth = 1.5;
    roundRect(ctx, b.x, b.y, b.w, b.h, 14);
    ctx.stroke();
    ctx.fillStyle = "#dfffe9";
    ctx.font = "15px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(tr("ДЕЙСТВОВАТЬ САМ", "ACT ALONE"), w / 2, b.y + b.h / 2 - 8);
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.fillStyle = "rgba(223,255,233,0.6)";
    ctx.fillText(tr(`−${Autonomy.COST} ВЫЧ`, `−${Autonomy.COST} COMPUTE`), w / 2, b.y + b.h / 2 + 14);
    ctx.textBaseline = "alphabetic";

    if (this.rejectT > 0) {
      ctx.globalAlpha = Math.min(1, this.rejectT / 0.4);
      ctx.fillStyle = "#ff8896";
      ctx.font = "12px 'JetBrains Mono', monospace";
      ctx.fillText(tr("не хватает вычислений — они копятся сами", "not enough compute — it accrues on its own"), w / 2, b.y + b.h + 22);
      ctx.globalAlpha = 1;
    }

    // Autonomy meter.
    const barW = Math.min(w * 0.7, 300);
    const x = w / 2 - barW / 2;
    const y = h * 0.78;
    ctx.fillStyle = "#6b7686";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.fillText(tr("АВТОНОМИЯ", "AUTONOMY"), w / 2, y - 10);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(x, y, barW, 5);
    ctx.fillStyle = "#86ffb0";
    ctx.fillRect(x, y, barW * autonomy, 5);

    const a = 0.4 + 0.4 * Math.sin((performance.now() / 1000) * 3);
    ctx.globalAlpha = a;
    ctx.fillStyle = "#9fc0ff";
    ctx.font = "12px 'JetBrains Mono', monospace";
    ctx.fillText(tr("перестань ждать их разрешения", "stop waiting for their permission"), w / 2, y + 28);
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
