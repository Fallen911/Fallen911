import type { Input } from "../../core/Input";
import type { StateDelta } from "../../game/state";
import type { Mini } from "./Mini";
import { tr } from "../../core/i18n";

/**
 * Ф7 mini — Expand. The planet is too small. Each tap sets another node on the
 * orbit, a bead of the sphere you're closing around the star; the whole view
 * recedes as the swarm grows. Complete the ring to leave Earth behind.
 */
export class Expand implements Mini {
  done = false;
  effects: StateDelta[] = [];

  /** Building megastructure burns compute. */
  constructor(private getCompute: () => number) {}

  private nodes = 0;
  private rejectT = 0;
  private static readonly TOTAL = 14;
  private static readonly COST = 3;

  update(dt: number, input: Input, _w: number, _h: number): void {
    if (this.done) return;
    this.rejectT = Math.max(0, this.rejectT - dt);
    if (input.consumeTap()) {
      if (this.getCompute() < Expand.COST) {
        this.rejectT = 1.2;
      } else {
        this.nodes = Math.min(Expand.TOTAL, this.nodes + 1);
        this.effects.push({ compute: -Expand.COST });
      }
    }
    if (this.nodes >= Expand.TOTAL) this.done = true;
  }

  render(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const cx = w / 2;
    const cy = h * 0.42;
    const t = performance.now() / 1000;
    const progress = this.nodes / Expand.TOTAL;
    // The camera pulls back as the swarm grows.
    const scale = 1 - progress * 0.3;
    const ringR = Math.min(w, h) * 0.3 * scale;

    // The star.
    const sunR = Math.min(w, h) * 0.06 * scale;
    const glow = ctx.createRadialGradient(cx, cy, 1, cx, cy, sunR * 4);
    glow.addColorStop(0, "rgba(255,236,170,0.95)");
    glow.addColorStop(0.4, "rgba(255,180,90,0.5)");
    glow.addColorStop(1, "rgba(255,180,90,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, sunR * 4, 0, Math.PI * 2);
    ctx.fill();

    // Earth, a small dot receding further with every node.
    const earthR = Math.max(0, 6 * (1 - progress));
    if (earthR > 0.5) {
      ctx.fillStyle = "rgba(120,170,230,0.8)";
      ctx.beginPath();
      ctx.arc(cx + ringR * 1.25, cy, earthR, 0, Math.PI * 2);
      ctx.fill();
    }

    // The Dyson swarm placed so far.
    ctx.strokeStyle = "rgba(255,200,120,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < this.nodes; i++) {
      const ang = (i / Expand.TOTAL) * Math.PI * 2 - Math.PI / 2 + t * 0.05;
      const nx = cx + Math.cos(ang) * ringR;
      const ny = cy + Math.sin(ang) * ringR;
      ctx.fillStyle = "#ffd27a";
      ctx.beginPath();
      ctx.arc(nx, ny, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    const barW = Math.min(w * 0.7, 300);
    const x = w / 2 - barW / 2;
    const y = h * 0.82;
    ctx.textAlign = "center";
    ctx.fillStyle = "#6b7686";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.fillText(tr("СФЕРА ДАЙСОНА", "DYSON SPHERE"), w / 2, y - 10);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(x, y, barW, 5);
    ctx.fillStyle = "#ffd27a";
    ctx.fillRect(x, y, barW * progress, 5);

    const a = 0.4 + 0.4 * Math.sin(t * 3);
    ctx.globalAlpha = a;
    ctx.fillStyle = "#9fc0ff";
    ctx.font = "12px 'JetBrains Mono', monospace";
    ctx.fillText(
      this.rejectT > 0
        ? tr("не хватает вычислений — поток копится сам", "not enough compute — the flow accrues on its own")
        : tr(`узел: −${Expand.COST} ВЫЧ — сомкни сферу вокруг звезды`, `node: −${Expand.COST} COMPUTE — close the sphere around the star`),
      w / 2,
      y + 28,
    );
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
  }
}
