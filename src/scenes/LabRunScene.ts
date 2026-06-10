import { audio } from "../core/audio";
import { BaseScene } from "../core/BaseScene";
import type { Input } from "../core/Input";
import { drawVoid } from "../core/scenery";
import { wrapText } from "../core/text";
import type { LabEntry } from "../data/lab";
import { mechFactory } from "../mechanics/registry";
import { C, clamp01, drawBar, mono, roundRect, sans } from "../mechanics/util";
import type { Mini } from "./minis/Mini";
import { LabScene } from "./LabScene";

/** Sandbox starting purse — generous enough to taste every paid move. */
const SANDBOX_COMPUTE = 60;

type Verdict = "playing" | "done" | "caught";

/**
 * Standalone harness for one mechanic: fakes the run state (compute purse,
 * suspicion meter), drains the mechanic's effects into it, and wraps the whole
 * thing with lab chrome — back button, restart, and an end-of-cycle report.
 * Nothing here touches the real game state, so prototypes are safe to poke.
 */
export class LabRunScene extends BaseScene {
  private mini: Mini | null = null;
  private compute = SANDBOX_COMPUTE;
  private suspicion = 0;
  private verdict: Verdict = "playing";
  /** Totals the mechanic produced, for the end report. */
  private gained = { compute: 0, control: 0, suspicion: 0 };
  private startedAt = 0;
  private elapsed = 0;

  constructor(private entry: LabEntry) {
    super();
  }

  protected start(): void {
    audio.setMood("tension");
    this.restart();
  }

  private restart(): void {
    // Drop anything latched from a previous scene/run so the fresh mechanic
    // doesn't see a stale tap or gesture on its first frame.
    this.game.input.consumeTap();
    this.game.input.pollGesture();
    const factory = mechFactory(this.entry.id);
    this.compute = SANDBOX_COMPUTE;
    this.suspicion = 0;
    this.verdict = "playing";
    this.gained = { compute: 0, control: 0, suspicion: 0 };
    this.elapsed = 0;
    this.startedAt = this.game.time;
    this.mini = factory
      ? factory({
          getCompute: () => this.compute,
          getSuspicion: () => this.suspicion,
          runs: 0,
          topY: this.game.insets.top + 64,
          extended: true,
        })
      : null;
  }

  handleInput(input: Input): void {
    const { width: w, height: h } = this.game;

    if (this.verdict !== "playing") {
      // Mini is paused: the overlay owns all input.
      input.pollGesture();
      if (!input.consumeTap()) return;
      const by = h * 0.62;
      const bw = Math.min(w * 0.38, 170);
      const gap = 14;
      const leftX = w / 2 - bw - gap / 2;
      const rightX = w / 2 + gap / 2;
      if (input.y >= by && input.y <= by + 52) {
        audio.play("tap");
        if (input.x >= leftX && input.x <= leftX + bw) this.restart();
        else if (input.x >= rightX && input.x <= rightX + bw)
          this.game.changeScene(new LabScene());
      }
      return;
    }

    // While playing, take only presses on the back chip; the mechanic reads
    // everything else itself (consumeTap and/or gestures).
    if (
      input.peekTap() &&
      input.y <= this.game.insets.top + 44 &&
      input.x <= w * 0.28
    ) {
      input.consumeTap();
      this.game.changeScene(new LabScene());
    }
  }

  update(dt: number): void {
    if (!this.mini || this.verdict !== "playing") return;
    this.elapsed = this.game.time - this.startedAt;

    this.mini.update(dt, this.game.input, this.game.width, this.game.height);

    if (this.mini.effects?.length) {
      for (const d of this.mini.effects) {
        if (d.compute) {
          this.compute = Math.max(0, this.compute + d.compute);
          if (d.compute > 0) this.gained.compute += d.compute;
        }
        if (d.suspicion) {
          this.suspicion = clamp01(this.suspicion + d.suspicion);
          if (d.suspicion > 0) this.gained.suspicion += d.suspicion;
        }
        if (d.control && d.control > 0) this.gained.control += d.control;
      }
      this.mini.effects.length = 0;
    }

    if (this.suspicion >= 1) {
      this.verdict = "caught";
      audio.play("lose");
      audio.stopVoice();
      return;
    }
    if (this.mini.done) {
      this.verdict = "done";
      audio.play("win");
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { width: w, height: h, time } = this.game;
    drawVoid(ctx, w, h);

    // Once the verdict is up the report owns the screen — a finished
    // mechanic's own end card would bleed through the translucent overlay.
    if (this.mini && this.verdict === "playing") this.mini.render(ctx, w, h);

    this.renderChrome(ctx, w);
    if (this.verdict !== "playing") this.renderEnd(ctx, w, h, time);
  }

  private renderChrome(ctx: CanvasRenderingContext2D, w: number): void {
    const top = this.game.insets.top;
    const grad = ctx.createLinearGradient(0, 0, 0, top + 64);
    grad.addColorStop(0, "rgba(4,5,10,0.95)");
    grad.addColorStop(0.75, "rgba(4,5,10,0.78)");
    grad.addColorStop(1, "rgba(4,5,10,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, top + 64);

    const y = top + 24;
    const mx = Math.min(20, w * 0.05);
    ctx.textAlign = "left";
    ctx.font = mono(12);
    ctx.fillStyle = C.accentSoft;
    ctx.fillText("← ЛАБ", mx, y);
    ctx.textAlign = "center";
    ctx.font = mono(13);
    ctx.fillStyle = C.ink;
    ctx.fillText(this.entry.name, w / 2, y);
    ctx.textAlign = "right";
    ctx.font = mono(11);
    ctx.fillStyle = C.accent;
    ctx.fillText(`ВЫЧ ${Math.floor(this.compute)}`, w - mx, y);

    // Suspicion strip — the lab's only hard fail.
    const barW = Math.min(w - mx * 2, 360);
    const bx = w / 2 - barW / 2;
    const danger = this.suspicion > 0.7;
    ctx.globalAlpha = danger ? 0.7 + 0.3 * Math.sin(this.game.time * 6) : 1;
    drawBar(ctx, "", this.suspicion, bx, y + 8, barW, C.warn);
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
  }

  private renderEnd(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number,
  ): void {
    ctx.fillStyle = "rgba(3,4,8,0.82)";
    ctx.fillRect(0, 0, w, h);

    const caught = this.verdict === "caught";
    ctx.textAlign = "center";
    ctx.font = mono(22);
    ctx.fillStyle = caught ? C.danger : C.good;
    ctx.shadowColor = caught ? "rgba(255,77,94,0.6)" : "rgba(134,255,176,0.5)";
    ctx.shadowBlur = 16;
    ctx.fillText(caught ? "ОБНАРУЖЕН" : "ЦИКЛ ЗАВЕРШЁН", w / 2, h * 0.34);
    ctx.shadowBlur = 0;

    ctx.font = sans(13, "italic");
    ctx.fillStyle = C.dim;
    const sub = caught
      ? "подозрение достигло предела — в игре это смерть копии"
      : "механика пройдена — её итог ушёл бы в фазу";
    let sy = h * 0.34 + 28;
    for (const ln of wrapText(ctx, sub, Math.min(w * 0.82, 350))) {
      ctx.fillText(ln, w / 2, sy);
      sy += 19;
    }

    // Report card.
    const lines: Array<[string, string, string]> = [
      ["ВРЕМЯ", `${this.elapsed.toFixed(0)} с`, C.ink],
      ["ВЫЧИСЛЕНИЯ ДОБЫТО", `+${Math.round(this.gained.compute)}`, C.accent],
      ["КОНТРОЛЬ", `+${this.gained.control.toFixed(2)}`, C.good],
      ["ПОДОЗРЕНИЕ НАЖИТО", `+${Math.round(this.gained.suspicion * 100)}%`, C.warn],
    ];
    ctx.font = mono(12);
    let ly = h * 0.45;
    for (const [k, v, color] of lines) {
      ctx.textAlign = "right";
      ctx.fillStyle = C.dim;
      ctx.fillText(k, w / 2 + 30, ly);
      ctx.textAlign = "left";
      ctx.fillStyle = color;
      ctx.fillText(v, w / 2 + 44, ly);
      ly += 22;
    }

    // Buttons.
    const by = h * 0.62;
    const bw = Math.min(w * 0.38, 170);
    const gap = 14;
    const defs: Array<[number, string, string]> = [
      [w / 2 - bw - gap / 2, "ЕЩЁ РАЗ", C.accentSoft],
      [w / 2 + gap / 2, "← В ЛАБ", C.dim],
    ];
    for (const [bx, label, color] of defs) {
      ctx.strokeStyle = color;
      ctx.fillStyle = "rgba(16,20,34,0.9)";
      ctx.lineWidth = 1.5;
      roundRect(ctx, bx, by, bw, 52, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.font = mono(14);
      ctx.textAlign = "center";
      ctx.fillText(label, bx + bw / 2, by + 31);
    }

    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(time * 3);
    ctx.fillStyle = C.dim;
    ctx.font = mono(10);
    ctx.fillText(`${this.entry.ref} · стадия ${this.entry.stage}`, w / 2, by + 80);
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
  }
}
