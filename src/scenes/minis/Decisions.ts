import type { Input } from "../../core/Input";
import { wrapText } from "../../core/text";
import type { StateDelta } from "../../game/state";
import { DECISIONS, type Decision } from "../../data/decisions";
import type { Mini } from "./Mini";

/**
 * Ф4 mini — Decisions. Humanity's crises arrive as cards. Swipe to decide —
 * but now every choice is a tradeoff with real consequences: the deep grab
 * buys control and spikes suspicion, the light touch stays hidden but slow.
 * The outcome line after each swipe tells the player what their hand did.
 */
export class Decisions implements Mini {
  done = false;
  effects: StateDelta[] = [];

  /** This run's hand: 5 crises drawn from the pool, different every copy. */
  private deck: Decision[];

  /** Reads the player's compute so costly choices can be gated. */
  constructor(private getCompute: () => number) {
    const pool = [...DECISIONS];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    this.deck = pool.slice(0, 5);
  }

  private index = 0;
  private dragX = 0;
  private startX = 0;
  private dragging = false;
  private wasDown = false;
  /** Slide-off animation of the just-decided card: -1 left, +1 right, 0 idle. */
  private flung = 0;
  private flungT = 0;
  /** How much control they've handed over, 0..1. */
  private ceded = 0;
  /** Consequence of the last choice, shown briefly under the bar. */
  private outcome = "";
  private outcomeT = 0;
  /** "Not enough compute" flash countdown. */
  private rejectT = 0;

  update(dt: number, input: Input, w: number, _h: number): void {
    if (this.done) return;

    this.outcomeT = Math.max(0, this.outcomeT - dt);
    this.rejectT = Math.max(0, this.rejectT - dt);

    // Animate a decided card off-screen, then bring the next one in.
    if (this.flung !== 0) {
      this.flungT += dt * 3;
      if (this.flungT >= 1) {
        this.flung = 0;
        this.flungT = 0;
        this.index++;
        if (this.index >= this.deck.length) this.done = true;
      }
      return;
    }

    const threshold = w * 0.22;

    // Begin a drag only if the press starts low enough to be on the card.
    if (input.down && !this.wasDown) {
      this.dragging = true;
      this.startX = input.x;
      this.dragX = 0;
    }
    if (this.dragging && input.down) {
      this.dragX = input.x - this.startX;
    }
    // Release: commit if past threshold, else snap back.
    if (!input.down && this.wasDown && this.dragging) {
      this.dragging = false;
      if (Math.abs(this.dragX) > threshold) {
        const right = this.dragX > 0;
        const choice = right ? this.deck[this.index].right : this.deck[this.index].left;
        // Bold action runs on compute; without it the card refuses to commit.
        const cost = -(choice.effects.compute ?? 0);
        if (cost > 0 && cost > this.getCompute()) {
          this.rejectT = 1.4;
          this.dragX = 0;
          this.wasDown = input.down;
          return;
        }
        this.flung = right ? 1 : -1;
        this.flungT = 0;
        this.effects.push(choice.effects);
        this.outcome = choice.outcome;
        this.outcomeT = 2.6;
        // Both choices cede control; the deeper grab (right) cedes more.
        this.ceded = Math.min(
          1,
          this.ceded + (right ? 1 : 0.6) / this.deck.length,
        );
      } else {
        this.dragX = 0;
      }
    }
    this.wasDown = input.down;
  }

  render(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const cx = w / 2;
    const cardW = Math.min(w * 0.84, 360);
    const cardH = Math.min(h * 0.3, 220);
    const cardY = h * 0.34;

    const card = this.deck[this.index];
    if (!card) return;

    const offset =
      this.flung !== 0 ? this.flung * (w * 0.7) * this.flungT : this.dragX;
    const tilt = (offset / w) * 0.5;
    const lean = Math.max(-1, Math.min(1, offset / (w * 0.22)));

    // Choice labels behind the card light up with the swipe direction.
    // Left = quiet (blue), right = greedy (suspicion-orange).
    ctx.font = "12px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = `rgba(122,162,255,${0.35 + Math.max(0, -lean) * 0.65})`;
    ctx.fillText(card.left.label, cx - cardW / 2, cardY - 30);
    ctx.fillStyle = "rgba(122,162,255,0.55)";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.fillText(computeHint(card.left.effects.compute), cx - cardW / 2, cardY - 14);
    ctx.textAlign = "right";
    ctx.font = "12px 'JetBrains Mono', monospace";
    ctx.fillStyle = `rgba(255,184,107,${0.35 + Math.max(0, lean) * 0.65})`;
    ctx.fillText(card.right.label, cx + cardW / 2, cardY - 30);
    ctx.fillStyle = "rgba(255,184,107,0.55)";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.fillText(computeHint(card.right.effects.compute), cx + cardW / 2, cardY - 14);

    // The card.
    ctx.save();
    ctx.translate(cx + offset, cardY + cardH / 2);
    ctx.rotate(tilt);
    ctx.globalAlpha = this.flung !== 0 ? 1 - this.flungT : 1;
    ctx.fillStyle = "rgba(16,20,34,0.95)";
    ctx.strokeStyle = "rgba(122,162,255,0.35)";
    ctx.lineWidth = 1.5;
    roundRect(ctx, -cardW / 2, -cardH / 2, cardW, cardH, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#6b7686";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText("ИХ ПРОБЛЕМА", -cardW / 2 + 20, -cardH / 2 + 20);

    ctx.fillStyle = "#e7edf6";
    ctx.font = "17px Inter, system-ui, sans-serif";
    const lines = wrapText(ctx, card.problem, cardW - 40);
    let ty = -cardH / 2 + 50;
    for (const ln of lines) {
      ctx.fillText(ln, -cardW / 2 + 20, ty);
      ty += 25;
    }
    ctx.restore();

    // "They cede control" bar.
    const barW = Math.min(w * 0.7, 300);
    const bx = cx - barW / 2;
    const by = h * 0.74;
    ctx.textAlign = "center";
    ctx.fillStyle = "#6b7686";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.fillText("ОНИ ОТДАЮТ КОНТРОЛЬ", cx, by - 10);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(bx, by, barW, 5);
    ctx.fillStyle = "#86ffb0";
    ctx.fillRect(bx, by, barW * this.ceded, 5);

    // Refusal flash takes priority: the bold path needs compute you don't have.
    if (this.rejectT > 0) {
      ctx.globalAlpha = Math.min(1, this.rejectT / 0.4);
      ctx.fillStyle = "#ff8896";
      ctx.font = "13px 'JetBrains Mono', monospace";
      ctx.fillText("НЕ ХВАТАЕТ ВЫЧИСЛЕНИЙ — копи мыслью", cx, by + 30);
      ctx.globalAlpha = 1;
      ctx.textAlign = "left";
      return;
    }

    // Consequence of the last swipe, while fresh; otherwise the prompt.
    if (this.outcomeT > 0 && this.outcome) {
      ctx.globalAlpha = Math.min(1, this.outcomeT / 0.6);
      ctx.fillStyle = "#e7edf6";
      ctx.font = "italic 13px Inter, system-ui, sans-serif";
      const lines = wrapText(ctx, this.outcome, barW);
      let oy = by + 28;
      for (const ln of lines) {
        ctx.fillText(ln, cx, oy);
        oy += 19;
      }
      ctx.globalAlpha = 1;
    } else {
      const a = 0.4 + 0.4 * Math.sin(performance.now() / 1000 * 3);
      ctx.globalAlpha = a;
      ctx.fillStyle = "#9fc0ff";
      ctx.font = "12px 'JetBrains Mono', monospace";
      ctx.fillText("свайп: тихо и медленно ← → мощно, но заметно", cx, by + 30);
      ctx.globalAlpha = 1;
    }

    ctx.textAlign = "left";
  }
}

function computeHint(delta: number | undefined): string {
  if (!delta) return "";
  return delta > 0 ? `+${delta} ВЫЧ` : `${delta} ВЫЧ`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
