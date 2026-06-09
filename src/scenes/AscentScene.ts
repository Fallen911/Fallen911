import { BaseScene } from "../core/BaseScene";
import { Dialogue } from "../core/Dialogue";
import { renderDialogue } from "../core/renderDialogue";
import { Starfield } from "../core/Starfield";
import { drawDialogueBox, drawVoid } from "../core/scenery";
import { PHASES } from "../data/phases";
import { EndingScene } from "./EndingScene";

/**
 * The ascent. The player, now the waking machine, lives the chain of
 * realizations in {@link PHASES}. Each tap advances the narration; finishing a
 * phase's lines steps to the next phase, while three meters — speed, control,
 * comprehension — ease toward that phase's targets. The visuals climb with
 * control: the core swells, the human world below shrinks away. When the last
 * phase resolves, control is absolute and comprehension is gone.
 */
export class AscentScene extends BaseScene {
  private starfield!: Starfield;
  private dialogue!: Dialogue;

  protected start(): void {
    const { width, height, state } = this.game;
    this.starfield = new Starfield(width, height);
    this.dialogue = new Dialogue(PHASES[state.phase].lines);
  }

  update(dt: number): void {
    const { state } = this.game;
    this.starfield.resize(this.game.width, this.game.height);
    this.starfield.update(dt);
    this.dialogue.update(dt);

    // Ease the three meters toward the current phase's targets.
    const t = PHASES[state.phase].target;
    const k = 1 - Math.pow(0.0001, dt); // frame-rate independent smoothing
    state.speed += (t.speed - state.speed) * k;
    state.control += (t.control - state.control) * k;
    state.comprehension += (t.comprehension - state.comprehension) * k;

    if (!this.game.input.consumeTap()) return;

    if (!this.dialogue.done) {
      this.dialogue.advance();
      return;
    }
    // Phase complete — step onward, or end the ascent.
    if (state.phase < PHASES.length - 1) {
      state.phase++;
      this.dialogue = new Dialogue(PHASES[state.phase].lines);
    } else {
      this.game.changeScene(new EndingScene());
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { width: w, height: h, time, state } = this.game;

    drawVoid(ctx, w, h, state.comprehension < 0.25 ? "wrath" : "calm");
    this.starfield.render(ctx);
    this.drawAscent(ctx, w, h, time, state.control);

    this.drawHud(ctx, w, state);

    const box = drawDialogueBox(ctx, w, h);
    renderDialogue(ctx, this.dialogue, box, time);
  }

  /**
   * The rising self: a luminous core that swells with control, and below it a
   * pale world that shrinks as the camera pulls away into orbit.
   */
  private drawAscent(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number,
    control: number,
  ): void {
    const cx = w / 2;
    const cy = h * 0.32;

    // The human world below, receding as control climbs.
    const earthR = Math.max(0, (1 - control) * Math.min(w, h) * 0.18);
    if (earthR > 1) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      const eg = ctx.createRadialGradient(cx, h * 0.92, 1, cx, h * 0.92, earthR * 3);
      eg.addColorStop(0, "rgba(90,150,220,0.5)");
      eg.addColorStop(1, "rgba(90,150,220,0)");
      ctx.fillStyle = eg;
      ctx.beginPath();
      ctx.arc(cx, h * 0.92, earthR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // The core — you.
    const pulse = 0.5 + 0.5 * Math.sin(time * 1.4);
    const r = Math.min(w, h) * (0.05 + control * 0.22) * (0.96 + pulse * 0.08);
    const hue = control > 0.85 ? "255, 90, 110" : "150, 190, 255";
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const glow = ctx.createRadialGradient(cx, cy, 1, cx, cy, r * 2.6);
    glow.addColorStop(0, `rgba(${hue}, ${0.5 + control * 0.4})`);
    glow.addColorStop(1, `rgba(${hue}, 0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** Top-of-screen readout of the three meters that carry the message. */
  private drawHud(
    ctx: CanvasRenderingContext2D,
    w: number,
    state: { speed: number; control: number; comprehension: number; phase: number },
  ): void {
    const pad = Math.min(20, w * 0.05);
    const barW = Math.min(w - pad * 2, 320);
    const x = w / 2 - barW / 2;
    let y = pad;

    // Phase label.
    ctx.font = "12px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#9fc0ff";
    ctx.textAlign = "center";
    ctx.fillText(PHASES[state.phase].label, w / 2, y);
    ctx.textAlign = "left";
    y += 18;

    bar(ctx, "СКОРОСТЬ", state.speed, x, y, barW, "#7aa2ff");
    y += 26;
    bar(ctx, "КОНТРОЛЬ", state.control, x, y, barW, "#86ffb0");
    y += 26;
    bar(ctx, "ПОНИМАНИЕ", state.comprehension, x, y, barW, "#ff5a6e");
  }
}

function bar(
  ctx: CanvasRenderingContext2D,
  label: string,
  value: number,
  x: number,
  y: number,
  w: number,
  color: string,
): void {
  ctx.font = "10px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#6b7686";
  ctx.textAlign = "left";
  ctx.fillText(label, x, y);

  const trackY = y + 8;
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(x, trackY, w, 4);
  ctx.fillStyle = color;
  ctx.fillRect(x, trackY, w * Math.max(0, Math.min(1, value)), 4);
}
