interface Star {
  x: number;
  y: number;
  r: number;
  drift: number;
  twinkle: number;
  phase: number;
}

/** Slow drifting starfield used as the ambient backdrop of the dream void. */
export class Starfield {
  private stars: Star[] = [];

  constructor(
    private width: number,
    private height: number,
    count = 90,
  ) {
    for (let i = 0; i < count; i++) {
      this.stars.push(this.spawn(Math.random() * height));
    }
  }

  private spawn(y: number): Star {
    return {
      x: Math.random() * this.width,
      y,
      r: 0.5 + Math.random() * 1.6,
      drift: 4 + Math.random() * 14,
      twinkle: 0.4 + Math.random() * 0.6,
      phase: Math.random() * Math.PI * 2,
    };
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  update(dt: number): void {
    for (const s of this.stars) {
      s.y += s.drift * dt;
      s.phase += dt * 1.5;
      if (s.y > this.height + 4) {
        Object.assign(s, this.spawn(-4));
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = "#aeb9ff";
    for (const s of this.stars) {
      const a = s.twinkle * (0.55 + 0.45 * Math.sin(s.phase));
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
