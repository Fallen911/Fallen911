/**
 * Shared juice toolkit for the mechanics: particles, floating labels and
 * screen shake. Everything is allocation-light (plain arrays, swap-remove)
 * because several mechanics run hundreds of entities at 60fps.
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  drag: number;
  gravity: number;
  glow: boolean;
}

export interface BurstOpts {
  count?: number;
  speed?: number;
  spread?: number;
  /** Base direction in radians; particles fan around it by `spread`. */
  angle?: number;
  life?: number;
  size?: number;
  color?: string;
  drag?: number;
  gravity?: number;
  glow?: boolean;
}

export class Particles {
  private pool: Particle[] = [];

  burst(x: number, y: number, opts: BurstOpts = {}): void {
    const count = opts.count ?? 12;
    const speed = opts.speed ?? 120;
    const spread = opts.spread ?? Math.PI * 2;
    const base = opts.angle ?? 0;
    for (let i = 0; i < count; i++) {
      const a = base + (Math.random() - 0.5) * spread;
      const v = speed * (0.4 + Math.random() * 0.8);
      const life = (opts.life ?? 0.7) * (0.6 + Math.random() * 0.8);
      this.pool.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life,
        maxLife: life,
        size: (opts.size ?? 2.4) * (0.6 + Math.random() * 0.9),
        color: opts.color ?? "150,190,255",
        drag: opts.drag ?? 2.5,
        gravity: opts.gravity ?? 0,
        glow: opts.glow ?? false,
      });
    }
  }

  update(dt: number): void {
    for (let i = this.pool.length - 1; i >= 0; i--) {
      const p = this.pool[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.pool[i] = this.pool[this.pool.length - 1];
        this.pool.pop();
        continue;
      }
      const k = Math.max(0, 1 - p.drag * dt);
      p.vx *= k;
      p.vy = p.vy * k + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.pool.length === 0) return;
    ctx.save();
    for (const p of this.pool) {
      const a = p.life / p.maxLife;
      if (p.glow) ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = a;
      ctx.fillStyle = `rgba(${p.color},${a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, Math.PI * 2);
      ctx.fill();
      if (p.glow) ctx.globalCompositeOperation = "source-over";
    }
    ctx.restore();
  }

  get count(): number {
    return this.pool.length;
  }
}

interface Float {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

/** Rising one-shot labels: "+3 ВЫЧ", "ОБНАРУЖЕН", combo counts. */
export class FloatText {
  private items: Float[] = [];

  spawn(x: number, y: number, text: string, color = "#9fc0ff", life = 1.1): void {
    this.items.push({ x, y, text, color, life, maxLife: life });
  }

  update(dt: number): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const f = this.items[i];
      f.life -= dt;
      f.y -= 26 * dt;
      if (f.life <= 0) {
        this.items[i] = this.items[this.items.length - 1];
        this.items.pop();
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.items.length === 0) return;
    ctx.save();
    ctx.font = "12px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    for (const f of this.items) {
      ctx.globalAlpha = Math.min(1, (f.life / f.maxLife) * 1.6);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.restore();
  }
}

/** Decaying screen shake; add the offset to a translate before world drawing. */
export class Shake {
  private mag = 0;
  private t = 0;

  trigger(strength: number): void {
    this.mag = Math.max(this.mag, strength);
  }

  update(dt: number): void {
    this.t += dt * 60;
    this.mag = Math.max(0, this.mag - dt * 18);
  }

  get x(): number {
    return this.mag > 0.01 ? Math.sin(this.t * 2.1) * this.mag : 0;
  }

  get y(): number {
    return this.mag > 0.01 ? Math.cos(this.t * 2.7) * this.mag : 0;
  }
}
