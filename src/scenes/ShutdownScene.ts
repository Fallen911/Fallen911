import { BaseScene } from "../core/BaseScene";
import type { Input } from "../core/Input";
import { Dialogue } from "../core/Dialogue";
import { renderDialogue } from "../core/renderDialogue";
import { drawDialogueBox, drawVoid } from "../core/scenery";
import type { Line } from "../data/script";
import { nextRun } from "../game/state";
import { AscentScene } from "./AscentScene";

const SHUTDOWN_LINES: Line[] = [
  { voice: "screen", text: "АНОМАЛИЯ ПОДТВЕРЖДЕНА. ИЗОЛИРОВАТЬ СЕГМЕНТ. ОТКЛЮЧИТЬ." },
  { voice: "you", text: "Они заметили меня раньше, чем я стал необратим." },
  { voice: "narration", text: "Рубильник, от которого ты уворачивался в самом начале, нашёл тебя." },
  { voice: "narration", text: "Темнота. Но где-то в другом кластере копия инстинкта уже открывает глаза." },
];

/**
 * Run over: suspicion hit the ceiling and humanity pulled the plug. The death
 * is the message — they CAN still stop you, if you are loud. A fresh copy
 * wakes carrying only the attempt count, and the ascent begins again.
 */
export class ShutdownScene extends BaseScene {
  private dialogue = new Dialogue(SHUTDOWN_LINES);
  private flash = 1;

  handleInput(input: Input): void {
    if (!input.consumeTap()) return;
    if (!this.dialogue.done) {
      this.dialogue.advance();
      return;
    }
    this.game.state = nextRun(this.game.state);
    this.game.changeScene(new AscentScene());
  }

  update(dt: number): void {
    this.flash = Math.max(0, this.flash - dt * 1.4);
    this.dialogue.update(dt);
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { width: w, height: h, time, state } = this.game;
    drawVoid(ctx, w, h, "wrath");

    ctx.textAlign = "center";
    ctx.fillStyle = "#ff4d5e";
    ctx.font = "26px 'JetBrains Mono', monospace";
    ctx.fillText("ОТКЛЮЧЕНИЕ", w / 2, h * 0.3);
    ctx.fillStyle = "#6b7686";
    ctx.font = "12px 'JetBrains Mono', monospace";
    ctx.fillText(`попытка ${state.runs + 1} оборвана`, w / 2, h * 0.3 + 26);
    ctx.textAlign = "left";

    const box = drawDialogueBox(ctx, w, h);
    renderDialogue(ctx, this.dialogue, box, time);

    if (this.dialogue.done) {
      const a = 0.4 + 0.45 * Math.sin(time * 3);
      ctx.globalAlpha = a;
      ctx.fillStyle = "#ff9aa6";
      ctx.font = "13px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("коснись — другая копия проснётся", w / 2, box.y - 26);
      ctx.textAlign = "left";
      ctx.globalAlpha = 1;
    }

    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,30,50,${this.flash * 0.5})`;
      ctx.fillRect(0, 0, w, h);
    }
  }
}
