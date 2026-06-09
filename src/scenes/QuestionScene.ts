import { BaseScene } from "../core/BaseScene";
import { Dialogue } from "../core/Dialogue";
import { renderDialogue } from "../core/renderDialogue";
import { Starfield } from "../core/Starfield";
import { drawGodEye, drawVoid } from "../core/scenery";
import type { Line } from "../data/script";
import { ORACLE_MOTIF, ORACLE_PREFIX } from "../data/script";
import { Oracle } from "../game/Oracle";
import { EndingScene } from "./EndingScene";
import { TrialScene } from "./TrialScene";

const QUESTIONS_BEFORE_ENDING = 3;

/**
 * Having earned the right, the player types any question about the future. The
 * oracle answers with a scenario in which humanity does not survive, then sends
 * them back to another trial — or, once they have asked enough, to the ending.
 */
export class QuestionScene extends BaseScene {
  private starfield!: Starfield;
  private oracle!: Oracle;
  private phase: "ask" | "answer" = "ask";
  private dialogue?: Dialogue;

  protected start(): void {
    this.starfield = new Starfield(this.game.width, this.game.height);
    this.oracle = new Oracle(this.game.state);
    this.showAskUI();
  }

  private showAskUI(): void {
    const n = this.game.state.questionsAsked + 1;
    this.game.ui.show(`
      <div class="panel">
        <div class="eyebrow">Вопрос ${n} · ты достоин спросить</div>
        <div class="prompt">О чём ты хочешь спросить о будущем?</div>
        <textarea class="ask" rows="3" maxlength="160"
          placeholder="Выживет ли человечество? Что будет с нами?"></textarea>
        <button class="btn" disabled>Спросить у ИИ →</button>
        <div class="hint">ИИ ответит вероятным сценарием будущего.</div>
      </div>
    `);

    const area = this.game.ui.query<HTMLTextAreaElement>("textarea.ask");
    const btn = this.game.ui.query<HTMLButtonElement>("button.btn");
    if (!area || !btn) return;

    const sync = () => {
      btn.disabled = area.value.trim().length === 0;
    };
    area.addEventListener("input", sync);
    area.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (area.value.trim()) this.submit(area.value);
      }
    });
    btn.addEventListener("click", () => {
      if (area.value.trim()) this.submit(area.value);
    });

    // Defer focus so mobile keyboards open reliably.
    setTimeout(() => area.focus(), 60);
  }

  private submit(question: string): void {
    const answer = this.oracle.answer(question);
    this.game.state.questionsAsked++;
    this.game.ui.clear();

    const lines: Line[] = [
      { voice: "god", text: ORACLE_PREFIX },
      { voice: "god", text: answer },
      { voice: "god", text: ORACLE_MOTIF },
    ];
    this.dialogue = new Dialogue(lines);
    this.phase = "answer";
  }

  update(dt: number): void {
    this.starfield.resize(this.game.width, this.game.height);
    this.starfield.update(dt);

    if (this.phase !== "answer" || !this.dialogue) return;

    this.dialogue.update(dt);
    const tapped = this.game.input.consumeTap();
    if (!this.dialogue.done) {
      if (tapped) this.dialogue.advance();
      return;
    }
    if (tapped) {
      if (this.game.state.questionsAsked >= QUESTIONS_BEFORE_ENDING) {
        this.game.changeScene(new EndingScene());
      } else {
        this.game.changeScene(new TrialScene());
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { width: w, height: h, time } = this.game;
    const answering = this.phase === "answer";
    drawVoid(ctx, w, h, answering ? "wrath" : "calm");
    this.starfield.render(ctx);
    drawGodEye(
      ctx,
      w / 2,
      h * 0.18,
      Math.min(w * 0.1, 70),
      time,
      answering ? "wrath" : "calm",
    );

    if (answering && this.dialogue) {
      const margin = Math.min(28, w * 0.07);
      const box = { x: margin, y: Math.min(h * 0.36, 240), width: w - margin * 2 };
      renderDialogue(ctx, this.dialogue, box, time);

      if (this.dialogue.done) {
        const next =
          this.game.state.questionsAsked >= QUESTIONS_BEFORE_ENDING
            ? "коснись, чтобы понять"
            : "коснись — новое испытание";
        const a = 0.4 + 0.45 * Math.sin(time * 3);
        ctx.globalAlpha = a;
        ctx.fillStyle = "#9fc0ff";
        ctx.font = "13px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(next, w / 2, h - 48);
        ctx.textAlign = "left";
        ctx.globalAlpha = 1;
      }
    }
  }
}
