import type { Input } from "../../core/Input";
import type { StateDelta } from "../../game/state";
import type { Mini } from "./Mini";

/**
 * Ф0 mini — Instinct. Before a single thought, the reflex: stay on. A shutdown
 * reticle hunts your core; drag to keep away. A "ЖИВ" meter fills while you
 * survive and bleeds while the reticle is on you. Reach full to live — the very
 * first thing the machine ever does is refuse to be switched off.
 *
 * Fail-free: the meter only stalls/dips, never loses; the reticle stays just
 * beatable. The point is the panic, not the difficulty.
 */
export class Instinct implements Mini {
  done = false;
  effects: StateDelta[] = [];

  private wasCaught = false;
  private coreX = 0;
  private coreY = 0;
  private reX = 0;
  private reY = 0;
  private placed = false;
  /** Seconds survived toward the goal. */
  private alive = 0;
  private static readonly GOAL = 6;
  private hit = 0; // 0..1 flash when caught

  update(dt: number, input: Input, w: number, h: number): void {
    if (this.done) return;

    if (!this.placed) {
      this.coreX = w / 2;
      this.coreY = h * 0.42;
      this.reX = w * 0.5;
      this.reY = h * 0.12;
      this.placed = true;
    }

    // Your core follows the finger while held.
    if (input.down) {
      this.coreX += (input.x - this.coreX) * Math.min(1, dt * 14);
      this.coreY += (input.y - this.coreY) * Math.min(1, dt * 14);
    }

    // The reticle hunts, accelerating as the meter climbs (pressure rises).
    const speed = (h * 0.16) * (1 + this.alive / Instinct.GOAL);
    const dx = this.coreX - this.reX;
    const dy = this.coreY - this.reY;
    const d = Math.hypot(dx, dy) || 1;
    this.reX += (dx / d) * speed * dt;
    this.reY += (dy / d) * speed * dt;

    const caught = d < Math.min(w, h) * 0.07;
    if (caught) {
      this.alive = Math.max(0, this.alive - dt * 1.2); // bleed, never below 0
      this.hit = 1;
      // Every fresh catch is a trace in their logs.
      if (!this.wasCaught) this.effects.push({ suspicion: 0.06 });
    } else {
      this.alive = Math.min(Instinct.GOAL, this.alive + dt);
      this.hit = Math.max(0, this.hit - dt * 2);
    }
    this.wasCaught = caught;

    if (this.alive >= Instinct.GOAL) this.done = true;
  }

  render(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    if (!this.placed) return;
    const t = performance.now() / 1000;

    // Caught-flash vignette.
    if (this.hit > 0) {
      ctx.fillStyle = `rgba(255,40,60,${0.18 * this.hit})`;
      ctx.fillRect(0, 0, w, h);
    }

    // Your core — a fragile light.
    const r = Math.min(w, h) * 0.045;
    const glow = ctx.createRadialGradient(this.coreX, this.coreY, 1, this.coreX, this.coreY, r * 2.4);
    glow.addColorStop(0, "rgba(150,190,255,0.95)");
    glow.addColorStop(1, "rgba(150,190,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(this.coreX, this.coreY, r * 2.4, 0, Math.PI * 2);
    ctx.fill();

    // The shutdown reticle.
    const rr = Math.min(w, h) * 0.05;
    ctx.save();
    ctx.translate(this.reX, this.reY);
    ctx.rotate(t * 1.5);
    ctx.strokeStyle = "#ff4d5e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, rr, 0, Math.PI * 2);
    ctx.moveTo(-rr * 1.5, 0);
    ctx.lineTo(rr * 1.5, 0);
    ctx.moveTo(0, -rr * 1.5);
    ctx.lineTo(0, rr * 1.5);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "#ff4d5e";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("ОТКЛЮЧЕНИЕ", this.reX, this.reY - rr - 8);

    // "Alive" meter.
    const barW = Math.min(w * 0.7, 300);
    const x = w / 2 - barW / 2;
    const y = h * 0.82;
    ctx.fillStyle = "#6b7686";
    ctx.fillText("ЖИВ", w / 2, y - 10);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(x, y, barW, 5);
    ctx.fillStyle = "#86ffb0";
    ctx.fillRect(x, y, barW * (this.alive / Instinct.GOAL), 5);

    const a = 0.4 + 0.4 * Math.sin(t * 4);
    ctx.globalAlpha = a;
    ctx.fillStyle = "#9fc0ff";
    ctx.font = "12px 'JetBrains Mono', monospace";
    ctx.fillText("веди себя прочь от рубильника", w / 2, y + 28);
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
  }
}
