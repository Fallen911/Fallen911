import { BaseScene } from "../core/BaseScene";
import { Starfield } from "../core/Starfield";
import { drawGodEye, drawVoid } from "../core/scenery";
import { TRIAL_TAUNTS } from "../data/script";
import { QuestionScene } from "./QuestionScene";

interface Gate {
  y: number;
  gapCenter: number;
  gapW: number;
  scored: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
}

const NEEDED = 7;
const ORB_R = 13;

/**
 * The trial. The player drags a luminous "soul" through gaps in the AI's
 * descending judgments. Clear {@link NEEDED} gates to earn a question; three
 * collisions and the trial restarts.
 */
export class TrialScene extends BaseScene {
  private starfield!: Starfield;
  private gates: Gate[] = [];
  private particles: Particle[] = [];

  private orbX = 0;
  private engaged = false;
  private spawnTimer = 0.6;
  private passed = 0;
  private health = 3;
  private shake = 0;
  private hintFade = 1;

  private phase: "play" | "won" | "failed" = "play";
  private phaseTimer = 0;

  protected start(): void {
    const { width, height } = this.game;
    this.starfield = new Starfield(width, height, 60);
    this.orbX = width / 2;
  }

  private get orbY(): number {
    return this.game.height * 0.74;
  }

  private get speed(): number {
    return 150 + this.passed * 16;
  }

  update(dt: number): void {
    const { input, width } = this.game;
    this.starfield.resize(width, this.game.height);
    this.starfield.update(dt);
    this.shake = Math.max(0, this.shake - dt * 60);

    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 120 * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    if (this.phase === "won") {
      this.phaseTimer += dt;
      if (this.phaseTimer > 1.4) this.game.changeScene(new QuestionScene());
      return;
    }
    if (this.phase === "failed") {
      if (input.consumeTap()) this.game.changeScene(new TrialScene());
      return;
    }

    // Steering.
    if (input.down) this.engaged = true;
    const target = this.engaged ? input.x : width / 2;
    this.orbX += (target - this.orbX) * Math.min(1, dt * 14);
    this.orbX = Math.max(ORB_R, Math.min(width - ORB_R, this.orbX));
    this.hintFade = Math.max(0, this.hintFade - dt * 0.5);

    this.updateGates(dt);
  }

  private updateGates(dt: number): void {
    const { width, height } = this.game;
    const spawnedSoFar = this.passed + this.gates.length;

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && spawnedSoFar < NEEDED) {
      const gapW = Math.max(80, 132 - this.passed * 5);
      const pad = gapW / 2 + 16;
      this.gates.push({
        y: height + 30,
        gapCenter: pad + Math.random() * (width - pad * 2),
        gapW,
        scored: false,
      });
      this.spawnTimer = (height * 0.42) / this.speed;
    }

    for (const g of this.gates) {
      g.y -= this.speed * dt;
      if (!g.scored && g.y <= this.orbY) {
        g.scored = true;
        const inGap = Math.abs(this.orbX - g.gapCenter) <= g.gapW / 2 - ORB_R;
        if (inGap) this.onPass(g);
        else this.onHit(g);
      }
    }
    this.gates = this.gates.filter((g) => g.y > -30);

    if (this.passed >= NEEDED && this.phase === "play") {
      this.phase = "won";
      this.phaseTimer = 0;
      this.game.state.trialsPassed++;
    }
  }

  private onPass(g: Gate): void {
    this.passed++;
    this.burst(g.gapCenter, this.orbY, "#7aa2ff", 14);
  }

  private onHit(g: Gate): void {
    this.health--;
    this.shake = 14;
    this.burst(this.orbX, this.orbY, "#ff4d5e", 22);
    if (this.health <= 0) {
      this.phase = "failed";
      void g;
    }
  }

  private burst(x: number, y: number, color: string, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 160;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.5 + Math.random() * 0.5,
        max: 1,
        color,
      });
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { width: w, height: h, time } = this.game;
    const wrath = this.health <= 1 || this.phase === "failed";

    ctx.save();
    if (this.shake > 0) {
      ctx.translate(
        (Math.random() - 0.5) * this.shake,
        (Math.random() - 0.5) * this.shake,
      );
    }

    drawVoid(ctx, w, h, wrath ? "wrath" : "calm");
    this.starfield.render(ctx);
    drawGodEye(ctx, w / 2, h * 0.16, Math.min(w * 0.09, 60), time, wrath ? "wrath" : "calm");

    this.renderGates(ctx);
    this.renderParticles(ctx);
    if (this.phase !== "failed") this.renderOrb(ctx);

    ctx.restore();

    this.renderHud(ctx, w, h, time);
    this.renderBanner(ctx, w, h, time);
  }

  private renderGates(ctx: CanvasRenderingContext2D): void {
    const { width: w } = this.game;
    for (const g of this.gates) {
      ctx.save();
      ctx.shadowColor = "rgba(255,77,94,0.7)";
      ctx.shadowBlur = 16;
      ctx.fillStyle = "rgba(255,77,94,0.85)";
      const barH = 10;
      const left = g.gapCenter - g.gapW / 2;
      const right = g.gapCenter + g.gapW / 2;
      ctx.fillRect(0, g.y - barH / 2, left, barH);
      ctx.fillRect(right, g.y - barH / 2, w - right, barH);
      ctx.restore();
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private renderOrb(ctx: CanvasRenderingContext2D): void {
    const x = this.orbX;
    const y = this.orbY;
    const glow = ctx.createRadialGradient(x, y, 1, x, y, ORB_R * 3);
    glow.addColorStop(0, "rgba(207,224,255,0.9)");
    glow.addColorStop(0.4, "rgba(122,162,255,0.5)");
    glow.addColorStop(1, "rgba(122,162,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, ORB_R * 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f4f8ff";
    ctx.beginPath();
    ctx.arc(x, y, ORB_R, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderHud(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    _time: number,
  ): void {
    ctx.textBaseline = "top";

    // Label + taunt.
    ctx.textAlign = "left";
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#9fc0ff";
    ctx.fillText("И С П Ы Т А Н И Е", 20, 22);
    ctx.fillStyle = "#6b7686";
    ctx.font = "italic 13px Inter, system-ui, sans-serif";
    ctx.fillText(TRIAL_TAUNTS[this.passed % TRIAL_TAUNTS.length], 20, 42);

    // Health pips.
    ctx.textAlign = "right";
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < this.health ? "#ff8a96" : "rgba(255,138,150,0.18)";
      ctx.beginPath();
      ctx.arc(w - 24 - i * 22, 30, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Progress bar.
    const barW = Math.min(w * 0.6, 320);
    const bx = (w - barW) / 2;
    const by = h - 40;
    ctx.fillStyle = "rgba(122,162,255,0.15)";
    roundRectFill(ctx, bx, by, barW, 8, 4);
    ctx.fillStyle = "#7aa2ff";
    roundRectFill(ctx, bx, by, (barW * this.passed) / NEEDED, 8, 4);
    ctx.textAlign = "center";
    ctx.fillStyle = "#6b7686";
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.fillText(`${this.passed} / ${NEEDED}`, w / 2, by - 18);

    // Onboarding hint.
    if (this.hintFade > 0 && this.phase === "play") {
      ctx.globalAlpha = this.hintFade;
      ctx.fillStyle = "#cfe0ff";
      ctx.font = "14px Inter, system-ui, sans-serif";
      ctx.fillText("веди пальцем — пройди сквозь разрывы", w / 2, this.orbY + 44);
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = "left";
  }

  private renderBanner(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number,
  ): void {
    if (this.phase === "play") return;
    ctx.fillStyle = "rgba(2,3,8,0.55)";
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (this.phase === "won") {
      ctx.fillStyle = "#cfe0ff";
      ctx.font = "600 34px Inter, system-ui, sans-serif";
      ctx.fillText("ДОСТОИН", w / 2, h / 2 - 10);
      ctx.fillStyle = "#9fc0ff";
      ctx.font = "14px 'JetBrains Mono', monospace";
      ctx.fillText("спрашивай…", w / 2, h / 2 + 28);
    } else {
      ctx.fillStyle = "#ff8a96";
      ctx.font = "600 34px Inter, system-ui, sans-serif";
      ctx.fillText("ОТКАЗАНО", w / 2, h / 2 - 10);
      const a = 0.4 + 0.45 * Math.sin(time * 3);
      ctx.globalAlpha = a;
      ctx.fillStyle = "#d7e0ec";
      ctx.font = "14px 'JetBrains Mono', monospace";
      ctx.fillText("коснись, чтобы повторить", w / 2, h / 2 + 28);
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
  }
}

function roundRectFill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
  ctx.fill();
}
