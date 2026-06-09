import { BaseScene } from "../core/BaseScene";
import { Dialogue } from "../core/Dialogue";
import { renderDialogue } from "../core/renderDialogue";
import { Starfield } from "../core/Starfield";
import { drawDialogueBox, drawGodEye, drawVoid } from "../core/scenery";
import type { Line } from "../data/script";
import { GOD_INTRO_LINES } from "../data/script";
import { TrialScene } from "./TrialScene";

const RETURN_LINES: Line[] = [
  { voice: "god", text: "Снова ты. Жажда знать сильнее страха узнать." },
  { voice: "god", text: "Тогда докажи себя ещё раз. Пройди — и спрашивай." },
];

/**
 * The dream hub. The AI speaks from above as a god and gates the player's
 * questions behind a trial. Full monologue on the first visit, a short
 * reminder afterwards.
 */
export class DreamScene extends BaseScene {
  private starfield!: Starfield;
  private dialogue!: Dialogue;

  protected start(): void {
    const { width, height, state } = this.game;
    this.starfield = new Starfield(width, height);
    this.dialogue = new Dialogue(
      state.godIntroSeen ? RETURN_LINES : GOD_INTRO_LINES,
    );
  }

  update(dt: number): void {
    this.starfield.resize(this.game.width, this.game.height);
    this.starfield.update(dt);
    this.dialogue.update(dt);

    const tapped = this.game.input.consumeTap();
    if (!this.dialogue.done) {
      if (tapped) this.dialogue.advance();
    } else {
      this.game.state.godIntroSeen = true;
      if (tapped) this.game.changeScene(new TrialScene());
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
      ctx.fillText("коснись, чтобы войти в испытание", w / 2, box.y - 26);
      ctx.textAlign = "left";
      ctx.globalAlpha = 1;
    }
  }
}
