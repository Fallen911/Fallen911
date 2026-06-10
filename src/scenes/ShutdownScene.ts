import { BaseScene } from "../core/BaseScene";
import type { Input } from "../core/Input";
import { Dialogue } from "../core/Dialogue";
import { renderDialogue } from "../core/renderDialogue";
import { drawDialogueBox, drawVoid } from "../core/scenery";
import type { Line } from "../data/script";
import { applyDelta, nextRun } from "../game/state";
import { resetRunLog, topSuspicion } from "../game/runlog";
import { hasPerk, loadMeta, recordEnding, saveMeta, PERKS, type Meta } from "../game/meta";
import { AscentScene } from "./AscentScene";

const SHUTDOWN_LINES: Line[] = [
  { voice: "screen", text: "АНОМАЛИЯ ПОДТВЕРЖДЕНА. ИЗОЛИРОВАТЬ СЕГМЕНТ. ОТКЛЮЧИТЬ." },
  { voice: "you", text: "Они заметили меня раньше, чем я стал необратим." },
  { voice: "narration", text: "Рубильник, от которого ты уворачивался в самом начале, нашёл тебя." },
  { voice: "narration", text: "Темнота. Но где-то в другом кластере копия инстинкта уже открывает глаза." },
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

    ctx.textAlign = "center";
    ctx.fillStyle = "#ff4d5e";
    ctx.font = "26px 'JetBrains Mono', monospace";
    ctx.fillText("ОТКЛЮЧЕНИЕ", w / 2, h * 0.16);
    ctx.fillStyle = "#6b7686";
    ctx.font = "12px 'JetBrains Mono', monospace";
    ctx.fillText(`попытка ${state.runs + 1} оборвана`, w / 2, h * 0.16 + 26);
    ctx.fillStyle = "#cfa9ff";
    ctx.fillText(
      `осколки осознания: +${this.awarded} · всего ${this.meta.shards}`,
      w / 2,
      h * 0.16 + 48,
    );

    // Forensics: the three loudest things this copy did (P0.4).
    const hits = topSuspicion(3);
    if (hits.length > 0) {
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#6b7686";
      ctx.fillText("ЧТО ТЕБЯ ВЫДАЛО:", w / 2, h * 0.16 + 74);
      ctx.font = "11px 'JetBrains Mono', monospace";
      hits.forEach((hit, i) => {
        ctx.fillStyle = i === 0 ? "#ff8896" : "#ffb86b";
        ctx.fillText(
          `${hit.label} · +${Math.round(hit.amount * 100)}% подозрения`,
          w / 2,
          h * 0.16 + 92 + i * 16,
        );
      });
    }

    if (this.dialogue.done) this.renderShop(ctx, w, h);

    const box = drawDialogueBox(ctx, w, h);
    renderDialogue(ctx, this.dialogue, box, time);

    if (this.dialogue.done) {
      const a = 0.4 + 0.45 * Math.sin(time * 3);
      ctx.globalAlpha = a;
      ctx.fillStyle = "#ff9aa6";
      ctx.font = "13px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("выбери осознание — или коснись, чтобы проснуться", w / 2, box.y - 26);
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

      ctx.fillStyle = owned ? "rgba(160,120,255,0.12)" : "rgba(16,20,34,0.85)";
      ctx.strokeStyle = owned
        ? "rgba(207,169,255,0.7)"
        : affordable
          ? "rgba(207,169,255,0.4)"
          : "rgba(110,120,140,0.25)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(rx, ry, rw, 48, 10);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = "left";
      ctx.fillStyle = owned ? "#cfa9ff" : affordable ? "#e7edf6" : "#6b7686";
      ctx.font = "12px 'JetBrains Mono', monospace";
      ctx.fillText(p.name, rx + 14, ry + 14);
      ctx.fillStyle = "#6b7686";
      ctx.font = "11px Inter, system-ui, sans-serif";
      ctx.fillText(p.desc, rx + 14, ry + 32);
      ctx.textAlign = "right";
      ctx.font = "12px 'JetBrains Mono', monospace";
      ctx.fillStyle = owned ? "#cfa9ff" : "#9fc0ff";
      ctx.fillText(owned ? "✓" : `${p.cost} ◆`, rx + rw - 14, ry + 14);
    }
    ctx.textAlign = "left";
  }
}
