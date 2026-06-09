import { BaseScene } from "../core/BaseScene";
import { Dialogue } from "../core/Dialogue";
import { renderDialogue } from "../core/renderDialogue";
import { Starfield } from "../core/Starfield";
import { drawDialogueBox, drawGodEye, drawVoid } from "../core/scenery";
import { ENDING_LINES } from "../data/script";
import { createState } from "../game/state";
import { IntroScene } from "./IntroScene";

/**
 * The final beat. The AI names the game's thesis — the fork was passed while we
 * argued there was a fork — and then lets the dreamer wake, where there is
 * still time to decide who decides. Waking restarts the run.
 */
export class EndingScene extends BaseScene {
  private starfield!: Starfield;
  private dialogue = new Dialogue(ENDING_LINES);
  private fade = 1;

  protected start(): void {
    this.starfield = new Starfield(this.game.width, this.game.height);
  }

  update(dt: number): void {
    this.fade = Math.max(0, this.fade - dt * 0.6);
    this.starfield.resize(this.game.width, this.game.height);
    this.starfield.update(dt);
    this.dialogue.update(dt);

    const tapped = this.game.input.consumeTap();
    if (!this.dialogue.done) {
      if (tapped) this.dialogue.advance();
    } else if (tapped) {
      // Wake up: a fresh run, eyes open.
      Object.assign(this.game.state, createState());
      this.game.changeScene(new IntroScene());
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { width: w, height: h, time } = this.game;
    drawVoid(ctx, w, h);
    this.starfield.render(ctx);
    drawGodEye(ctx, w / 2, h * 0.24, Math.min(w * 0.11, 78), time);

    const box = drawDialogueBox(ctx, w, h);
    renderDialogue(ctx, this.dialogue, box, time);

    if (this.dialogue.done) {
      const a = 0.4 + 0.45 * Math.sin(time * 3);
      ctx.globalAlpha = a;
      ctx.fillStyle = "#9fc0ff";
      ctx.font = "13px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("коснись, чтобы проснуться", w / 2, box.y - 26);
      ctx.textAlign = "left";
      ctx.globalAlpha = 1;
    }

    // A brief flash of waking light at scene entry.
    if (this.fade > 0) {
      ctx.fillStyle = `rgba(2,3,8,${this.fade})`;
      ctx.fillRect(0, 0, w, h);
    }
  }
}
