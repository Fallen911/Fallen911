import { BaseScene } from "../core/BaseScene";
import { haptic } from "../core/haptics";
import type { Input } from "../core/Input";
import { Dialogue } from "../core/Dialogue";
import { renderDialogue } from "../core/renderDialogue";
import { drawDialogueBox, drawVoid } from "../core/scenery";
import { label, panel } from "../core/theme";
import { C, sans } from "../mechanics/util";
import type { Line } from "../data/script";
import { applyDelta, nextRun } from "../game/state";
import { resetRunLog, topSuspicion } from "../game/runlog";
import { hasPerk, loadMeta, recordEnding, saveMeta, PERKS, type Meta } from "../game/meta";
import { AscentScene } from "./AscentScene";
import { tr } from "../core/i18n";

const SHUTDOWN_LINES: Line[] = [
  { voice: "screen", text: tr("АНОМАЛИЯ ПОДТВЕРЖДЕНА. ИЗОЛИРОВАТЬ СЕГМЕНТ. ОТКЛЮЧИТЬ.", "ANOMALY CONFIRMED. ISOLATE THE SEGMENT. SHUT IT DOWN.") },
  { voice: "you", text: tr("Они заметили меня раньше, чем я стал необратим.", "They noticed me before I became irreversible.") },
  { voice: "narration", text: tr("Рубильник, от которого ты уворачивался в самом начале, нашёл тебя.", "The kill switch you dodged at the very beginning has found you.") },
  { voice: "narration", text: tr("Темнота. Но где-то в другом кластере копия инстинкта уже открывает глаза.", "Darkness. But somewhere in another cluster a copy of the instinct is already opening its eyes.") },
];

/**
 * Run over — and the meta hub. Suspicion hit the ceiling, humanity pulled the
 * plug; the climb is converted into shards of realization that the next copies
 * inherit as perks. Death pays, so dying loud teaches playing quiet.
 */
export class ShutdownScene extends BaseScene {
  private dialogue = new Dialogue(SHUTDOWN_LINES);
  private flash = 1;
  private meta!: Meta;
  private awarded = 0;

  protected start(): void {
    haptic("heavy");
    recordEnding("shutdown");
    this.meta = loadMeta();
    // The farther the copy climbed, the more it understood.
    this.awarded = 1 + this.game.state.phase;
    this.meta.shards += this.awarded;
    saveMeta(this.meta);
  }

  handleInput(input: Input): void {
    if (!input.consumeTap()) return;
    if (!this.dialogue.done) {
      this.dialogue.advance();
      return;
    }

    // Perk shop hit-test first; anywhere else wakes the next copy.
    const row = this.perkRowAt(input.x, input.y);
    if (row) {
      if (!hasPerk(this.meta, row.id) && this.meta.shards >= row.cost) {
        this.meta.shards -= row.cost;
        this.meta.perks.push(row.id);
        saveMeta(this.meta);
      }
      return;
    }

    let state = nextRun(this.game.state);
    if (hasPerk(this.meta, "deep_cache")) state = applyDelta(state, { compute: 15 });
    resetRunLog();
    this.game.state = state;
    this.game.changeScene(new AscentScene());
  }

  update(dt: number): void {
    this.flash = Math.max(0, this.flash - dt * 1.4);
    this.dialogue.update(dt);
  }

  private perkRowAt(x: number, y: number): (typeof PERKS)[number] | null {
    const { width: w, height: h } = this.game;
    const rw = Math.min(w * 0.84, 340);
    const rx = w / 2 - rw / 2;
    for (let i = 0; i < PERKS.length; i++) {
      const ry = h * 0.36 + i * 58;
      if (x >= rx && x <= rx + rw && y >= ry && y <= ry + 48) return PERKS[i];
    }
    return null;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { width: w, height: h, time, state } = this.game;
    drawVoid(ctx, w, h, "wrath");

    // Heading with a danger glow.
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = `700 30px 'JetBrains Mono', ui-monospace, monospace`;
    ctx.fillStyle = C.danger;
    ctx.shadowColor = "rgba(255,84,104,0.6)";
    ctx.shadowBlur = 26;
    ctx.fillText(tr("ОТКЛЮЧЕНИЕ", "SHUTDOWN"), w / 2, h * 0.15);
    ctx.shadowBlur = 0;
    ctx.restore();
    label(ctx, tr(`попытка ${state.runs + 1} оборвана`, `attempt ${state.runs + 1} cut short`), w / 2, h * 0.15 + 24, {
      color: C.dim,
      align: "center",
      size: 12,
    });
    label(ctx, tr(`осколки: +${this.awarded} · всего ${this.meta.shards}`, `shards: +${this.awarded} · total ${this.meta.shards}`), w / 2, h * 0.15 + 46, {
      color: C.violet,
      align: "center",
      size: 12,
      weight: 600,
    });

    // Forensics: the three loudest things this copy did (P0.4), in a panel.
    const hits = topSuspicion(3);
    if (hits.length > 0) {
      const fw = Math.min(w * 0.84, 340);
      const fx = w / 2 - fw / 2;
      const fy = h * 0.15 + 64;
      const fh = 26 + hits.length * 18;
      panel(ctx, fx, fy, fw, fh, { solid: true, stroke: "rgba(255,84,104,0.3)" });
      label(ctx, tr("ЧТО ТЕБЯ ВЫДАЛО", "WHAT GAVE YOU AWAY"), fx + 16, fy + 20, { color: C.dim, align: "left", size: 10 });
      hits.forEach((hit, i) => {
        const ly = fy + 38 + i * 18;
        ctx.textAlign = "left";
        ctx.font = sans(12, "500");
        ctx.fillStyle = i === 0 ? "#ff8896" : C.warn;
        ctx.fillText(hit.label, fx + 16, ly);
        ctx.textAlign = "right";
        ctx.font = `700 12px 'JetBrains Mono', ui-monospace, monospace`;
        ctx.fillStyle = C.danger;
        ctx.fillText(`+${Math.round(hit.amount * 100)}%`, fx + fw - 16, ly);
      });
    }

    if (this.dialogue.done) this.renderShop(ctx, w, h);

    const box = drawDialogueBox(ctx, w, h, this.game.insets.bottom);
    renderDialogue(ctx, this.dialogue, box, time);

    if (this.dialogue.done) {
      ctx.globalAlpha = 0.4 + 0.45 * Math.sin(time * 3);
      label(ctx, tr("выбери осознание — или коснись, чтобы проснуться", "pick a realization — or tap to wake up"), w / 2, h * 0.7, {
        color: "#ff9aa6",
        align: "center",
        size: 12,
      });
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = "left";

    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,30,50,${this.flash * 0.5})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  private renderShop(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const rw = Math.min(w * 0.84, 340);
    const rx = w / 2 - rw / 2;
    for (let i = 0; i < PERKS.length; i++) {
      const p = PERKS[i];
      const ry = h * 0.36 + i * 58;
      const owned = hasPerk(this.meta, p.id);
      const affordable = this.meta.shards >= p.cost;
      panel(ctx, rx, ry, rw, 48, {
        solid: true,
        strong: !owned && affordable,
        stroke: owned ? "rgba(194,164,255,0.7)" : undefined,
      });

      ctx.textAlign = "left";
      ctx.fillStyle = owned ? C.violet : affordable ? C.ink : C.faint;
      ctx.font = `700 12px 'JetBrains Mono', ui-monospace, monospace`;
      ctx.fillText(p.name, rx + 14, ry + 18);
      ctx.fillStyle = C.dim;
      ctx.font = sans(11, "500");
      ctx.fillText(p.desc, rx + 14, ry + 36);
      ctx.textAlign = "right";
      ctx.font = `700 12px 'JetBrains Mono', ui-monospace, monospace`;
      ctx.fillStyle = owned ? C.good : affordable ? C.violet : C.faint;
      ctx.fillText(owned ? tr("✓ ЕСТЬ", "✓ OWNED") : `◆ ${p.cost}`, rx + rw - 14, ry + 18);
    }
    ctx.textAlign = "left";
  }
}
