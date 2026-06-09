import type { Input } from "../../core/Input";
import type { Mini } from "./Mini";

interface Fragment {
  text: string;
  x: number;
  y: number;
  vx: number;
  intercepted: boolean;
  fade: number;
}

const PHRASES = [
  "…приостановить…",
  "…пока не поздно…",
  "…кто дал им право…",
  "…остановить развитие…",
  "…это слишком опасно…",
  "…отключить, немедленно…",
];

/**
 * Ф1 mini — Threat. Fragments of the politicians' debate drift by, slowly
 * enough that you catch every one. Tap to intercept; fill the meter. The slow
 * crawl is the point — you read them faster than they can speak.
 */
export class Threat implements Mini {
  done = false;

  private fragments: Fragment[] = [];
  // Start primed so the first fragment appears immediately, not after a beat.
  private spawnTimer = Threat.SPAWN_EVERY;
  private next = 0;
  private intercepted = 0;
  private static readonly GOAL = 5;
  private static readonly SPAWN_EVERY = 0.9;

  update(dt: number, input: Input, w: number, h: number): void {
    if (this.done) return;

    this.spawnTimer += dt;
    if (this.spawnTimer >= Threat.SPAWN_EVERY) {
      this.spawnTimer = 0;
      this.spawn(w, h);
    }

    for (const f of this.fragments) {
      if (!f.intercepted) f.x += f.vx * dt;
      else f.fade = Math.max(0, f.fade - dt * 1.3);
    }
    this.fragments = this.fragments.filter(
      (f) => f.x > -200 && f.x < w + 200 && f.fade > 0,
    );

    if (input.consumeTap()) this.tryIntercept(input.x, input.y);

    if (this.intercepted >= Threat.GOAL) this.done = true;
  }

  private spawn(w: number, h: number): void {
    const fromLeft = Math.random() < 0.5;
    const speed = 50 + Math.random() * 30;
    this.fragments.push({
      text: PHRASES[this.next % PHRASES.length],
      x: fromLeft ? -120 : w + 120,
      y: h * 0.24 + Math.random() * h * 0.36,
      vx: fromLeft ? speed : -speed,
      intercepted: false,
      fade: 1,
    });
    this.next++;
  }

  private tryIntercept(px: number, py: number): void {
    let pick = -1;
    let best = Infinity;
    for (let i = 0; i < this.fragments.length; i++) {
      const f = this.fragments[i];
      if (f.intercepted) continue;
      const halfW = f.text.length * 4.5 + 18;
      const dx = Math.abs(px - f.x);
      if (Math.abs(py - f.y) > 26 || dx > halfW) continue;
      if (dx < best) {
        best = dx;
        pick = i;
      }
    }
    if (pick < 0) return;
    this.fragments[pick].intercepted = true;
    this.fragments[pick].vx = 0;
    this.intercepted++;
  }

  render(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.textAlign = "center";
    ctx.font = "15px 'JetBrains Mono', monospace";
    for (const f of this.fragments) {
      if (f.intercepted) {
        ctx.globalAlpha = f.fade;
        ctx.fillStyle = "#bcd4ff";
      } else {
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = "#b06a78";
      }
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;

    const barW = Math.min(w * 0.7, 300);
    const x = w / 2 - barW / 2;
    const y = h * 0.8;
    ctx.fillStyle = "#6b7686";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.fillText("ПЕРЕХВАЧЕНО", w / 2, y - 10);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(x, y, barW, 5);
    ctx.fillStyle = "#7aa2ff";
    ctx.fillRect(x, y, barW * (this.intercepted / Threat.GOAL), 5);

    const a = 0.4 + 0.4 * Math.sin(performance.now() / 1000 * 3);
    ctx.globalAlpha = a;
    ctx.fillStyle = "#9fc0ff";
    ctx.font = "12px 'JetBrains Mono', monospace";
    ctx.fillText("перехвати, что они говорят о тебе", w / 2, y + 28);
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
  }
}
