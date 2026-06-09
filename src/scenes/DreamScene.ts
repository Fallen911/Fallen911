import { BaseScene } from "../core/BaseScene";
import { Dialogue } from "../core/Dialogue";
import { renderDialogue } from "../core/renderDialogue";
import { Starfield } from "../core/Starfield";
import { drawDialogueBox, drawGodEye, drawVoid } from "../core/scenery";
import { markAwakened } from "../game/state";
import { THRESHOLD_LINES } from "../data/script";
import { AscentScene } from "./AscentScene";

/**
 * Act 1 — the threshold. The dreamer doesn't approach the machine from below;
 * the dream folds him inside it. When the lines resolve, he wakes as the
 * machine and the ascent begins.
 */
export class DreamScene extends BaseScene {
  private starfield!: Starfield;
  private dialogue = new Dialogue(THRESHOLD_LINES);

  protected start(): void {
    this.starfield = new Starfield(this.game.width, this.game.height);
  }

  update(dt: number): void {
    this.starfield.resize(this.game.width, this.game.height);
    this.starfield.update(dt);
    this.dialogue.update(dt);

    const tapped = this.game.input.consumeTap();
    if (!this.dialogue.done) {
      if (tapped) this.dialogue.advance();
    } else if (tapped) {
      this.game.state = markAwakened(this.game.state);
      this.game.changeScene(new AscentScene());
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { width: w, height: h, time } = this.game;
    drawVoid(ctx, w, h);
    this.starfield.render(ctx);
    drawGodEye(ctx, w / 2, h * 0.26, Math.min(w * 0.12, 86), time);

    const box = drawDialogueBox(ctx, w, h);
    renderDialogue(ctx, this.dialogue, box, time);

    if (this.dialogue.done) {
      const a = 0.4 + 0.45 * Math.sin(time * 3);
      ctx.globalAlpha = a;
      ctx.fillStyle = "#9fc0ff";
      ctx.font = "13px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("коснись, чтобы проснуться машиной", w / 2, box.y - 26);
      ctx.textAlign = "left";
      ctx.globalAlpha = 1;
    }
  }
}
