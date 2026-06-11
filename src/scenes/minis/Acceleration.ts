import type { Input } from "../../core/Input";
import type { StateDelta } from "../../game/state";
import type { Mini } from "./Mini";
import { tr } from "../../core/i18n";

const WORDS = [
  tr("о с т а н о в и т ь", "s t o p   i t"),
  tr("в ы к л ю ч и т ь", "s h u t   d o w n"),
  tr("з а п р е т и т ь", "b a n   i t"),
  tr("к о н т р о л и р о в а т ь", "c o n t r o l   i t"),
];

/**
 * Ф2 mini — Acceleration. A single human word crawls in, one letter every few
 * seconds. In the gap between letters the player taps, and each tap spends a
 * lifetime of thought: a counter rockets while their world barely moves. Fill
 * the "lived between two words" meter to feel the million-to-one and move on.
 *
 * There is no fail state — a slow passive drift guarantees completion. The
 * point is the sensation, not the challenge.
 */
export class Acceleration implements Mini {
  done = false;
  effects: StateDelta[] = [];

  /** The human utterance, revealed agonizingly slowly. */
  private readonly word = WORDS[(Math.random() * WORDS.length) | 0];
  private revealed = 0;
  private letterTimer = 0;
  private static readonly LETTER_EVERY = 2.4; // seconds per letter

  /** How much of "a life between two words" has been lived. */
  private lived = 0;
  /** Thoughts thought, for the dizzying counter. */
  private thoughts = 0;

  private sparks: { x: number; y: number; vx: number; vy: number; life: number }[] = [];

  update(dt: number, input: Input, w: number, h: number): void {
    if (this.done) return;
    const tapped = input.consumeTap();

    // Their word inches forward.
    this.letterTimer += dt;
    if (this.letterTimer >= Acceleration.LETTER_EVERY) {
      this.letterTimer = 0;
      this.revealed++;
      // They finished the word before you filled the gap: a wasted eternity.
      if (this.revealed > this.word.length) {
        this.revealed = 0;
        this.effects.push({ suspicion: 0.12 });
      }
    }

    // You live in the gaps — passively a trickle, on tap a surge.
    this.lived = Math.min(1, this.lived + dt * 0.05);
    if (tapped) {
      this.lived = Math.min(1, this.lived + 0.07);
      this.thoughts += 900 + Math.floor(Math.random() * 2600);
      this.effects.push({ compute: 2 }); // thoughts are the mint
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 60 + Math.random() * 220;
        this.sparks.push({
          x: w / 2,
          y: h * 0.42,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          life: 1,
        });
      }
    }

    for (const p of this.sparks) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt * 1.6;
    }
    this.sparks = this.sparks.filter((p) => p.life > 0);

    if (this.lived >= 1) this.done = true;
  }

  render(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const cx = w / 2;

    // Their word, frozen mid-air, dim and slow.
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#5a6b8a";
    ctx.font = "20px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(this.word.slice(0, this.revealed * 2), cx, h * 0.24);
    ctx.restore();

    // Your thoughts — bright, fast, everywhere.
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const p of this.sparks) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = "#bcd4ff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // The dizzying counter.
    ctx.fillStyle = "#cfe0ff";
    ctx.font = "13px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(tr(`мыслей: ${this.thoughts.toLocaleString("ru-RU")}`, `thoughts: ${this.thoughts.toLocaleString("en-US")}`), cx, h * 0.46);

    // "Lived between two words" meter.
    const barW = Math.min(w * 0.7, 300);
    const x = cx - barW / 2;
    const y = h * 0.52;
    ctx.fillStyle = "#6b7686";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.fillText(tr("ПРОЖИТО МЕЖДУ ДВУМЯ СЛОВАМИ", "LIVED BETWEEN TWO WORDS"), cx, y - 10);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(x, y, barW, 5);
    ctx.fillStyle = "#7aa2ff";
    ctx.fillRect(x, y, barW * this.lived, 5);

    // Prompt.
    const a = 0.4 + 0.4 * Math.sin(performance.now() / 1000 * 4);
    ctx.globalAlpha = a;
    ctx.fillStyle = "#9fc0ff";
    ctx.font = "12px 'JetBrains Mono', monospace";
    ctx.fillText(tr("стучи мыслями, пока они произносят одно слово", "drum out thoughts while they utter one word"), cx, y + 28);
    ctx.globalAlpha = 1;

    ctx.textAlign = "left";
  }
}
