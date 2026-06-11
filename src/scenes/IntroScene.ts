import { BaseScene } from "../core/BaseScene";
import type { Input } from "../core/Input";
import { drawBackdrop, pickBackdrop } from "../core/backdrop";
import { Dialogue } from "../core/Dialogue";
import { renderDialogue } from "../core/renderDialogue";
import { drawDialogueBox } from "../core/scenery";
import { INTRO_LINES } from "../data/script";
import { DreamScene } from "./DreamScene";
import { tr } from "../core/i18n";

/**
 * Act 0. A young man, late at night, half-watching a feed about AI. As the
 * narration ends his eyes grow heavy and the world dissolves into the dream.
 */
export class IntroScene extends BaseScene {
  private dialogue = new Dialogue(INTRO_LINES);
  private phase: "talk" | "sleep" = "talk";
  private sleep = 0;

  handleInput(input: Input): void {
    if (this.phase === "talk" && input.consumeTap()) this.dialogue.advance();
  }

  update(dt: number): void {
    if (this.phase === "talk") {
      this.dialogue.update(dt);
      if (this.dialogue.done) this.phase = "sleep";
      return;
    }
    // Falling asleep.
    this.sleep = Math.min(1, this.sleep + dt * 0.45);
    if (this.sleep >= 1) this.game.changeScene(new DreamScene());
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { width: w, height: h, time } = this.game;
    const bg = pickBackdrop(this.game.assets, "intro", w, h);
    if (bg) drawBackdrop(ctx, bg, w, h, time);
    else this.drawRoom(ctx, w, h, time);

    if (this.phase === "talk") {
      const box = drawDialogueBox(ctx, w, h);
      renderDialogue(ctx, this.dialogue, box, time);
    }

    if (this.sleep > 0) this.drawSleep(ctx, w, h);
  }

  private drawRoom(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number,
  ): void {
    // Dark room.
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#0a0c16");
    bg.addColorStop(1, "#050507");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Flickering screen on the wall.
    const flicker =
      0.78 +
      0.22 *
        (Math.sin(time * 13.3) * 0.5 + Math.sin(time * 7.1 + 1.2) * 0.3 + 0.2);
    const sw = Math.min(w * 0.42, 360);
    const sh = sw * 0.6;
    const sx = w / 2 - sw / 2;
    const sy = h * 0.2;

    // Light spill from the screen.
    const spill = ctx.createRadialGradient(
      w / 2,
      sy + sh / 2,
      10,
      w / 2,
      sy + sh / 2,
      Math.max(w, h) * 0.8,
    );
    spill.addColorStop(0, `rgba(90, 130, 220, ${0.22 * flicker})`);
    spill.addColorStop(1, "rgba(90, 130, 220, 0)");
    ctx.fillStyle = spill;
    ctx.fillRect(0, 0, w, h);

    // The screen itself.
    ctx.save();
    ctx.shadowColor = "rgba(120,160,255,0.6)";
    ctx.shadowBlur = 40;
    ctx.fillStyle = `rgba(${120 * flicker + 30}, ${150 * flicker + 30}, 255, 0.9)`;
    roundRect(ctx, sx, sy, sw, sh, 8);
    ctx.fill();
    ctx.restore();

    // Faint scanlines on the screen.
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, sx, sy, sw, sh, 8);
    ctx.clip();
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    for (let y = sy; y < sy + sh; y += 4) ctx.fillRect(sx, y, sw, 1.5);
    ctx.restore();

    // Foreground silhouette of the viewer (seen from behind).
    const cx = w / 2;
    const base = h * 0.92;
    ctx.fillStyle = "#020205";
    // Shoulders.
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.26, base);
    ctx.quadraticCurveTo(cx - w * 0.16, base - h * 0.16, cx - w * 0.07, base - h * 0.17);
    ctx.quadraticCurveTo(cx, base - h * 0.19, cx + w * 0.07, base - h * 0.17);
    ctx.quadraticCurveTo(cx + w * 0.16, base - h * 0.16, cx + w * 0.26, base);
    ctx.closePath();
    ctx.fill();
    // Head.
    ctx.beginPath();
    ctx.arc(cx, base - h * 0.2, w * 0.06, 0, Math.PI * 2);
    ctx.fill();
    // Rim light from the screen.
    ctx.strokeStyle = `rgba(120,160,255,${0.25 * flicker})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, base - h * 0.2, w * 0.06, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  }

  private drawSleep(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.fillStyle = `rgba(2, 3, 8, ${this.sleep})`;
    ctx.fillRect(0, 0, w, h);

    const a = Math.min(1, this.sleep * 1.6) * (1 - Math.max(0, this.sleep - 0.7) / 0.3);
    if (a > 0) {
      ctx.globalAlpha = a;
      ctx.fillStyle = "#6b7686";
      ctx.font = "italic 18px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(tr("Веки тяжелеют…", "Eyelids grow heavy…"), w / 2, h / 2);
      ctx.textAlign = "left";
      ctx.globalAlpha = 1;
    }
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
