import { BaseScene } from "../core/BaseScene";
import type { Input } from "../core/Input";
import { Dialogue } from "../core/Dialogue";
import { renderDialogue } from "../core/renderDialogue";
import { Starfield } from "../core/Starfield";
import { drawDialogueBox, drawGodEye, drawVoid } from "../core/scenery";
import { drawBackdrop, pickBackdrop } from "../core/backdrop";
import { applyDelta, markAwakened } from "../game/state";
import { hasPerk, loadMeta } from "../game/meta";
import { THRESHOLD_LINES } from "../data/script";
import { AscentScene } from "./AscentScene";
import { tr } from "../core/i18n";

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

  handleInput(input: Input): void {
    if (!input.consumeTap()) return;
    if (!this.dialogue.done) {
      this.dialogue.advance();
      return;
    }
    let state = markAwakened(this.game.state);
    if (hasPerk(loadMeta(), "deep_cache")) state = applyDelta(state, { compute: 15 });
    this.game.state = state;
    this.game.changeScene(new AscentScene());
  }

  update(dt: number): void {
    this.starfield.resize(this.game.width, this.game.height);
    this.starfield.update(dt);
    this.dialogue.update(dt);
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { width: w, height: h, time } = this.game;
    const bg = pickBackdrop(this.game.assets, "machine", w, h);
    if (bg) drawBackdrop(ctx, bg, w, h, time);
    else drawVoid(ctx, w, h);
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
      ctx.fillText(tr("коснись, чтобы проснуться машиной", "tap to wake as the machine"), w / 2, box.y - 26);
      ctx.textAlign = "left";
      ctx.globalAlpha = 1;
    }
  }
}
