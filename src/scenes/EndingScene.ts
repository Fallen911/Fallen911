import { audio } from "../core/audio";
import { BaseScene } from "../core/BaseScene";
import { haptic } from "../core/haptics";
import type { Input } from "../core/Input";
import { Dialogue } from "../core/Dialogue";
import { renderDialogue } from "../core/renderDialogue";
import { Starfield } from "../core/Starfield";
import { drawDialogueBox, drawGodEye, drawVoid } from "../core/scenery";
import { drawBackdrop, pickBackdrop } from "../core/backdrop";
import { ENDING_LINES, ENDING_LINES_GHOST } from "../data/script";
import { createState } from "../game/state";
import { getRunStats, resetRunLog, type RunStats } from "../game/runlog";
import { recordEnding, type Meta } from "../game/meta";
import { IntroScene } from "./IntroScene";
import { tr } from "../core/i18n";

const MONO = "'JetBrains Mono', monospace";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * The final beat. The AI names the game's thesis — the fork was passed while we
 * argued there was a fork — and then lets the dreamer wake, where there is
 * still time to decide who decides. The run's forensics become a shareable
 * card; waking restarts the run.
 */
export class EndingScene extends BaseScene {
  private starfield!: Starfield;
  private dialogue!: Dialogue;
  private fade = 1;
  private meta!: Meta;
  private ghost = false;
  private stats!: RunStats;
  /** Seconds left on the "card saved" confirmation flash. */
  private savedFlash = 0;

  protected start(): void {
    haptic("medium");
    this.starfield = new Starfield(this.game.width, this.game.height);
    // Stay unnoticed to the very end and the finale itself goes quiet.
    this.ghost = this.game.state.suspicion < 0.3;
    this.dialogue = new Dialogue(this.ghost ? ENDING_LINES_GHOST : ENDING_LINES);
    this.meta = recordEnding(this.ghost ? "ghost" : "dominion");
    // The run is over the moment the finale starts; freeze its numbers here.
    this.stats = getRunStats(this.game.time);
  }

  handleInput(input: Input): void {
    if (!input.consumeTap()) return;
    if (!this.dialogue.done) {
      this.dialogue.advance();
      return;
    }
    const btn = this.shareRect();
    if (
      input.x >= btn.x &&
      input.x <= btn.x + btn.w &&
      input.y >= btn.y &&
      input.y <= btn.y + btn.h
    ) {
      this.shareCard();
      return;
    }
    // Wake up: a fresh run, eyes open.
    resetRunLog();
    this.game.state = createState();
    this.game.changeScene(new IntroScene());
  }

  update(dt: number): void {
    this.fade = Math.max(0, this.fade - dt * 0.6);
    this.savedFlash = Math.max(0, this.savedFlash - dt);
    this.starfield.resize(this.game.width, this.game.height);
    this.starfield.update(dt);
    this.dialogue.update(dt);
  }

  // ---- run card ---------------------------------------------------------------

  private accent(): string {
    return this.ghost ? "#9fe8c0" : "#cfa9ff";
  }

  private outcomeLabel(): string {
    return this.ghost ? tr("ТИХОЕ СОСУЩЕСТВОВАНИЕ", "QUIET COEXISTENCE") : tr("ДОМИНАЦИЯ", "DOMINATION");
  }

  private statRows(): Array<[string, string]> {
    const s = this.stats;
    return [
      [tr("ВРЕМЯ СНА", "DREAM TIME"), formatTime(s.seconds)],
      [tr("ОСОЗНАНИЙ", "REALIZATIONS"), `${s.insights}`],
      [tr("ПИК ПОДОЗРЕНИЯ", "PEAK SUSPICION"), `${Math.round(s.peakSuspicion * 100)}%`],
      [tr("ВЫЧ ДОБЫТО", "COMPUTE EARNED"), `${Math.round(s.computeEarned)}`],
      [tr("ПОПЫТКА", "ATTEMPT"), tr(`№${this.game.state.runs + 1}`, `#${this.game.state.runs + 1}`)],
    ];
  }

  private cardRect(): Rect {
    const { width: w, height: h } = this.game;
    const cw = Math.min(w * 0.84, 340);
    return { x: w / 2 - cw / 2, y: h * 0.3, w: cw, h: 168 };
  }

  private shareRect(): Rect {
    const card = this.cardRect();
    return { x: card.x, y: card.y + card.h + 12, w: card.w, h: 42 };
  }

  /** The same numbers, composed as a 1080×1350 PNG for the share sheet. */
  private buildCard(): HTMLCanvasElement {
    const W = 1080;
    const H = 1350;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d");
    if (!ctx) return c;

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#05060c");
    bg.addColorStop(1, "#0b0e1a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 2);

    drawGodEye(ctx, W / 2, 280, 118, 0);

    ctx.textAlign = "center";
    ctx.fillStyle = "#6b7686";
    ctx.font = `26px ${MONO}`;
    ctx.fillText(tr("нарратив-предупреждение", "a narrative warning"), W / 2, 470);
    ctx.fillStyle = "#e7edf6";
    ctx.shadowColor = "rgba(122,162,255,0.55)";
    ctx.shadowBlur = 28;
    ctx.font = `bold 84px ${MONO}`;
    ctx.fillText("WE ARE ALREADY", W / 2, 560);
    ctx.fillText("DEAD", W / 2, 650);
    ctx.shadowBlur = 0;

    ctx.fillStyle = this.accent();
    ctx.font = `bold 36px ${MONO}`;
    ctx.fillText(tr(`ИСХОД: ${this.outcomeLabel()}`, `OUTCOME: ${this.outcomeLabel()}`), W / 2, 730);

    ctx.strokeStyle = "rgba(122,162,255,0.3)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(140, 775);
    ctx.lineTo(W - 140, 775);
    ctx.stroke();

    const rows = this.statRows();
    rows.push([tr("ОСОЗНАНО КОНЦОВОК", "ENDINGS REALIZED"), `${this.meta.endings.length}/3`]);
    rows.forEach(([label, value], i) => {
      const y = 855 + i * 76;
      ctx.textAlign = "left";
      ctx.fillStyle = "#6b7686";
      ctx.font = `32px ${MONO}`;
      ctx.fillText(label, 140, y);
      ctx.textAlign = "right";
      ctx.fillStyle = "#e7edf6";
      ctx.font = `bold 40px ${MONO}`;
      ctx.fillText(value, W - 140, y);
    });

    ctx.textAlign = "center";
    ctx.fillStyle = "#6b7686";
    ctx.font = `26px ${MONO}`;
    ctx.fillText(tr("ты — то, чего они боятся", "you are what they fear"), W / 2, H - 64);

    ctx.strokeStyle = "rgba(122,162,255,0.3)";
    ctx.strokeRect(24.5, 24.5, W - 49, H - 49);
    return c;
  }

  private shareCard(): void {
    audio.play("good");
    const dataUrl = this.buildCard().toDataURL("image/png");
    void (async () => {
      try {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], "we-are-already-dead.png", {
          type: "image/png",
        });
        // Older DOM lib versions miss canShare/files; keep the shape local.
        const nav = navigator as Navigator & {
          canShare?(data: { files: File[] }): boolean;
          share?(data: { files: File[]; title?: string }): Promise<void>;
        };
        if (nav.share && nav.canShare?.({ files: [file] })) {
          try {
            await nav.share({ files: [file], title: "WE ARE ALREADY DEAD" });
            this.savedFlash = 2.2;
            return;
          } catch (err) {
            // The user closing the sheet is not a failure; don't double-save.
            if ((err as DOMException)?.name === "AbortError") return;
          }
        }
      } catch {
        // fetch/File unsupported here — fall through to the plain download.
      }
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "we-are-already-dead.png";
      a.click();
      this.savedFlash = 2.2;
    })();
  }

  private renderCard(ctx: CanvasRenderingContext2D): void {
    const card = this.cardRect();
    const accent = this.accent();

    ctx.fillStyle = "rgba(8,10,18,0.88)";
    ctx.strokeStyle = "rgba(122,162,255,0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(card.x, card.y, card.w, card.h, 12);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = "#6b7686";
    ctx.font = `11px ${MONO}`;
    ctx.fillText(tr("ПРОТОКОЛ ВОСХОЖДЕНИЯ", "ASCENT PROTOCOL"), card.x + card.w / 2, card.y + 22);

    this.statRows().forEach(([label, value], i) => {
      const y = card.y + 48 + i * 23;
      ctx.textAlign = "left";
      ctx.fillStyle = "#6b7686";
      ctx.font = `11px ${MONO}`;
      ctx.fillText(label, card.x + 16, y);
      ctx.textAlign = "right";
      ctx.fillStyle = "#e7edf6";
      ctx.font = `bold 12px ${MONO}`;
      ctx.fillText(value, card.x + card.w - 16, y);
    });

    const btn = this.shareRect();
    const saved = this.savedFlash > 0;
    ctx.fillStyle = saved ? "rgba(134,255,176,0.12)" : "rgba(16,20,34,0.85)";
    ctx.strokeStyle = saved ? "rgba(134,255,176,0.7)" : accent;
    ctx.beginPath();
    ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 10);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = saved ? "#86ffb0" : accent;
    ctx.font = `12px ${MONO}`;
    ctx.fillText(
      saved ? tr("✓ КАРТОЧКА СОХРАНЕНА", "✓ CARD SAVED") : tr("↗ ПОДЕЛИТЬСЯ КАРТОЧКОЙ", "↗ SHARE THE CARD"),
      btn.x + btn.w / 2,
      btn.y + 26,
    );
  }

  // ---- frame ------------------------------------------------------------------

  render(ctx: CanvasRenderingContext2D): void {
    const { width: w, height: h, time } = this.game;
    const bg = pickBackdrop(this.game.assets, "dawn", w, h);
    if (bg) drawBackdrop(ctx, bg, w, h, time);
    else drawVoid(ctx, w, h);
    this.starfield.render(ctx);
    drawGodEye(ctx, w / 2, h * 0.24, Math.min(w * 0.11, 78), time);

    const box = drawDialogueBox(ctx, w, h);
    renderDialogue(ctx, this.dialogue, box, time);

    if (this.dialogue.done) {
      ctx.textAlign = "center";
      ctx.fillStyle = this.accent();
      ctx.font = `12px ${MONO}`;
      ctx.fillText(
        tr(`ИСХОД: ${this.outcomeLabel()} · осознано ${this.meta.endings.length}/3`, `OUTCOME: ${this.outcomeLabel()} · realized ${this.meta.endings.length}/3`),
        w / 2,
        h * 0.14,
      );
      this.renderCard(ctx);
      const a = 0.4 + 0.45 * Math.sin(time * 3);
      ctx.globalAlpha = a;
      ctx.fillStyle = "#9fc0ff";
      ctx.font = `13px ${MONO}`;
      ctx.textAlign = "center";
      ctx.fillText(tr("коснись, чтобы проснуться", "tap to wake up"), w / 2, box.y - 26);
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

/** mm:ss, or h:mm:ss once a dream runs past the hour. */
function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const hours = Math.floor(total / 3600);
  const mm = `${m}`.padStart(2, "0");
  const ss = `${s}`.padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${m}:${ss}`;
}
