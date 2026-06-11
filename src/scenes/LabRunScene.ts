import { audio } from "../core/audio";
import { BaseScene } from "../core/BaseScene";
import type { Input } from "../core/Input";
import { drawVoid } from "../core/scenery";
import { wrapText } from "../core/text";
import { button, chip, label, panel, suspicionBar } from "../core/theme";
import { renderStakeCard, stakeLayout } from "../core/overlays";
import { STAKES } from "../data/stakes";
import type { LabEntry } from "../data/lab";
import { mechFactory } from "../mechanics/registry";
import { C, clamp01, mono, sans } from "../mechanics/util";
import type { Mini } from "./minis/Mini";
import { LabScene } from "./LabScene";
import { tr } from "../core/i18n";

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
  /** Bet card shown before the mechanic starts. */
  private stake = true;
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
    this.compute = SANDBOX_COMPUTE;
    this.suspicion = 0;
    this.verdict = "playing";
    this.gained = { compute: 0, control: 0, suspicion: 0 };
    this.elapsed = 0;
    this.startedAt = this.game.time;
    this.mini = null;
    // The bet card gates the mechanic; if this mechanic has no stake, skip it.
    this.stake = STAKES[this.entry.id] != null;
    if (!this.stake) this.beginMech();
  }

  /** Create and start the mechanic after the bet card is dismissed. */
  private beginMech(): void {
    const factory = mechFactory(this.entry.id);
    this.stake = false;
    this.startedAt = this.game.time;
    this.game.input.consumeTap();
    this.game.input.pollGesture();
    this.mini = factory
      ? factory({
          getCompute: () => this.compute,
          getSuspicion: () => this.suspicion,
          runs: 0,
          topY: this.game.insets.top + 88,
          extended: true,
        })
      : null;
  }

  handleInput(input: Input): void {
    const { width: w, height: h } = this.game;

    // Bet card: START begins the mechanic, the back chip bails to the lab.
    if (this.stake) {
      if (input.peekTap() && input.y <= this.game.insets.top + 44 && input.x <= w * 0.28) {
        input.consumeTap();
        this.game.changeScene(new LabScene());
        return;
      }
      if (input.pollGesture()?.type !== "tap") return;
      input.consumeTap();
      const { start } = stakeLayout(w, h);
      if (input.x >= start.x && input.x <= start.x + start.w && input.y >= start.y && input.y <= start.y + start.h) {
        audio.play("tap");
        this.beginMech();
      }
      return;
    }

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
    if (this.stake || !this.mini || this.verdict !== "playing") return;
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
    const { width: w, height: h } = this.game;
    drawVoid(ctx, w, h);

    // Bet card first; then the mechanic under the chrome; then the report.
    if (this.stake) {
      const stake = STAKES[this.entry.id];
      this.renderChrome(ctx, w);
      if (stake) {
        renderStakeCard(ctx, w, h, {
          tag: tr("МЕХАНИК-ЛАБ", "MECHANICS LAB"),
          name: this.entry.name,
          ref: this.entry.ref,
          stake,
        });
      }
      return;
    }

    // Once the verdict is up the report owns the screen — a finished
    // mechanic's own end card would bleed through the translucent overlay.
    if (this.mini && this.verdict === "playing") this.mini.render(ctx, w, h);

    this.renderChrome(ctx, w);
    if (this.verdict !== "playing") this.renderEnd(ctx, w, h, this.game.time);
  }

  /** Lab chrome (v2): back/name/compute chips + the suspicion death-bar. */
  private renderChrome(ctx: CanvasRenderingContext2D, w: number): void {
    const top = this.game.insets.top;
    const grad = ctx.createLinearGradient(0, 0, 0, top + 92);
    grad.addColorStop(0, "rgba(4,6,12,0.96)");
    grad.addColorStop(0.7, "rgba(4,6,12,0.9)");
    grad.addColorStop(1, "rgba(4,6,12,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, top + 92);

    const pad = Math.min(14, w * 0.04);
    const chipH = 34;
    const y = Math.max(10, top) + 8;
    ctx.textBaseline = "middle";

    // Back chip.
    chip(ctx, pad, y, 88, chipH);
    label(ctx, tr("← ЛАБ", "← LAB"), pad + 44, y + chipH / 2, { size: 12, color: C.dim, align: "center", track: "0.06em", weight: 600 });

    // Mechanic name, centred.
    label(ctx, this.entry.name, w / 2, y + chipH / 2, { size: 13, color: C.ink, align: "center", track: "0.1em", weight: 700 });

    // Compute chip.
    const cw = 72;
    chip(ctx, w - pad - cw, y, cw, chipH);
    label(ctx, "◇", w - pad - cw + 14, y + chipH / 2, { size: 13, color: C.dim, align: "left", track: "0" });
    label(ctx, `${Math.floor(this.compute)}`, w - pad - 14, y + chipH / 2, { size: 14, color: C.accentSoft, align: "right", track: "0", weight: 700 });
    ctx.textBaseline = "alphabetic";

    // Suspicion death-bar — the lab's only hard fail.
    suspicionBar(
      ctx,
      pad,
      y + chipH + 12,
      w - pad * 2,
      this.suspicion,
      this.game.time,
      tr("ПОДОЗРЕНИЕ", "SUSPICION"),
      `${Math.round(this.suspicion * 100)}%`,
    );
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
    ctx.fillText(caught ? tr("ОБНАРУЖЕН", "DETECTED") : tr("ЦИКЛ ЗАВЕРШЁН", "CYCLE COMPLETE"), w / 2, h * 0.34);
    ctx.shadowBlur = 0;

    ctx.font = sans(13, "italic");
    ctx.fillStyle = C.dim;
    const sub = caught
      ? tr("подозрение достигло предела — в игре это смерть копии", "suspicion hit the ceiling — in the story that kills the copy")
      : tr("механика пройдена — её итог ушёл бы в фазу", "mechanic cleared — its outcome would feed the phase");
    let sy = h * 0.34 + 28;
    for (const ln of wrapText(ctx, sub, Math.min(w * 0.82, 350))) {
      ctx.fillText(ln, w / 2, sy);
      sy += 19;
    }

    // Report card.
    const rows: Array<[string, string, string]> = [
      [tr("ВРЕМЯ", "TIME"), tr(`${this.elapsed.toFixed(0)} с`, `${this.elapsed.toFixed(0)} s`), C.ink],
      [tr("ВЫЧ ДОБЫТО", "COMPUTE EARNED"), `+${Math.round(this.gained.compute)}`, C.accentSoft],
      [tr("КОНТРОЛЬ", "CONTROL"), `+${this.gained.control.toFixed(2)}`, C.good],
      [tr("ПОДОЗРЕНИЕ", "SUSPICION"), `+${Math.round(this.gained.suspicion * 100)}%`, C.warn],
    ];
    const cardW = Math.min(w * 0.82, 320);
    const cardX = w / 2 - cardW / 2;
    const cardY = h * 0.44;
    const cardH = rows.length * 26 + 24;
    panel(ctx, cardX, cardY, cardW, cardH, { solid: true });
    let ly = cardY + 26;
    for (const [k, v, color] of rows) {
      label(ctx, k, cardX + 18, ly, { color: C.dim, align: "left", size: 11, track: "0.1em" });
      ctx.textAlign = "right";
      ctx.font = `700 14px 'JetBrains Mono', ui-monospace, monospace`;
      ctx.fillStyle = color;
      ctx.fillText(v, cardX + cardW - 18, ly + 4);
      ly += 26;
    }

    // Buttons (hit-tested in handleInput with the same coords).
    const by = h * 0.62;
    const bw = Math.min(w * 0.38, 170);
    const gap = 14;
    button(ctx, w / 2 - bw - gap / 2, by, bw, 52, tr("ЕЩЁ РАЗ", "AGAIN"), "primary");
    button(ctx, w / 2 + gap / 2, by, bw, 52, tr("← В ЛАБ", "← TO LAB"), "ghost");

    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(time * 3);
    label(ctx, tr(`${this.entry.ref} · стадия ${this.entry.stage}`, `${this.entry.ref} · stage ${this.entry.stage}`), w / 2, by + 78, {
      color: C.dim,
      align: "center",
      size: 10,
      track: "0.08em",
    });
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
  }
}
