import type { Input } from "../core/Input";
import { tr } from "../core/i18n";
import type { StateDelta } from "../game/state";
import type { Mini } from "../scenes/minis/Mini";
import { CARDS, CRISES, REWARD_POOL, START_DECK, type CardDef } from "../data/deck";
import { TUTORIALS } from "../data/tutorials";
import type { MechEnv } from "./types";
import { FloatText, Particles, Shake } from "./fx";
import { C, Tutorial, clamp01, drawHint, mono, roundRect, sans, shuffle, truncate } from "./util";

const HAND_MAX = 5;
const DRAW_PER_TURN = 4;
const EXPOSURE_UNIT = 0.01; // 1 огласка → suspicion
const WIN_CONTROL = [0.03, 0.04, 0.05];

type Stage = "player" | "resolve" | "enemy" | "reward" | "transition";

/**
 * DECK — Slay the Spire in one screen. Humanity's crises are fights: each has
 * chaos to grind down and a telegraphed intent that lands every enemy turn.
 * Cards burn the run's actual compute, прикрытие soaks the incoming огласка
 * (1 = 0.01 suspicion), and combo cards reward planning the whole turn. Win
 * three crises, drafting a new card after each.
 */
export class Deck implements Mini {
  done = false;
  effects: StateDelta[] = [];

  private deck: CardDef[] = [];
  private draw: CardDef[] = [];
  private hand: CardDef[] = [];
  private discard: CardDef[] = [];

  private fight = 0;
  private chaos = 0;
  private chaosMax = 0;
  private intentIdx = 0;
  private block = 0;
  private playedThisTurn = 0;
  private lastPlayed: CardDef | null = null;
  private freeNext = false;
  /** +cost debuff for the next player turn (their "tighten" intent). */
  private tightened = 0;
  private stage: Stage = "transition";
  private stageT = 0;
  private turn = 1;
  private rewardChoices: CardDef[] = [];
  /** Floating state for card-played animation. */
  private playingCard: CardDef | null = null;
  private chaosShake = 0;
  private time = 0;

  private fx = new Particles();
  private floats = new FloatText();
  private shake = new Shake();
  private tutorial = new Tutorial("deck", TUTORIALS.deck);

  constructor(private env: MechEnv) {
    this.deck = START_DECK.map((id) => CARDS[id]);
    this.startFight(0);
  }

  // ---- fight flow ----------------------------------------------------------

  private startFight(i: number): void {
    this.fight = i;
    this.chaos = CRISES[i].chaos;
    this.chaosMax = CRISES[i].chaos;
    this.intentIdx = 0;
    this.block = 0;
    this.turn = 1;
    this.tightened = 0;
    this.draw = shuffle([...this.deck]);
    this.hand = [];
    this.discard = [];
    this.stage = "transition";
    this.stageT = 0;
    this.drawCards(DRAW_PER_TURN);
  }

  private drawCards(n: number): void {
    for (let k = 0; k < n; k++) {
      if (this.hand.length >= HAND_MAX) return;
      if (this.draw.length === 0) {
        if (this.discard.length === 0) return;
        this.draw = shuffle(this.discard);
        this.discard = [];
      }
      const card = this.draw.pop();
      if (card) this.hand.push(card);
    }
  }

  private cardCost(card: CardDef): number {
    if (this.freeNext) return 0;
    return card.cost + this.tightened;
  }

  private playCard(idx: number, w: number, h: number): void {
    const card = this.hand[idx];
    const cost = this.cardCost(card);
    if (cost > this.env.getCompute()) {
      this.floats.spawn(w / 2, h * 0.62, tr("НЕ ХВАТАЕТ ВЫЧ", "LOW COMPUTE"), C.danger, 0.9);
      return;
    }
    this.hand.splice(idx, 1);
    if (cost > 0) this.effects.push({ compute: -cost });
    if (this.freeNext) this.freeNext = false;

    this.applyCard(card, w, h);
    this.discard.push(card);
    this.playedThisTurn++;
    this.lastPlayed = card;
    this.playingCard = card;
    this.stage = "resolve";
    this.stageT = 0;
  }

  /** Resolve a card's payload (also used by ЭХО for the repeated card). */
  private applyCard(card: CardDef, w: number, h: number): void {
    const ex = h * 0.18 + 30;
    if (card.echo) {
      if (this.lastPlayed && !this.lastPlayed.echo) {
        this.applyCard(this.lastPlayed, w, h);
        this.floats.spawn(w / 2, ex + 60, tr("ЭХО", "ECHO"), C.violet, 0.9);
      } else {
        this.floats.spawn(w / 2, ex + 60, tr("эхо без источника", "no echo source"), C.dim, 0.9);
      }
      return;
    }
    let dmg = card.dmg ?? 0;
    if (card.perPlayed) dmg += card.perPlayed * this.playedThisTurn;
    if (dmg > 0) {
      this.chaos = Math.max(0, this.chaos - dmg);
      this.chaosShake = 1;
      this.floats.spawn(w / 2 + (Math.random() - 0.5) * 60, ex, `-${dmg}`, "#ff9d6b", 1);
      this.fx.burst(w / 2, ex, { count: 14, speed: 170, color: "255,157,107", glow: true });
    }
    if (card.block) {
      this.block += card.block;
      const c = this.col(w);
      this.floats.spawn(c.x + c.w * 0.2, h * 0.5, tr(`+${card.block} ПРИКРЫТИЕ`, `+${card.block} COVER`), C.accentSoft, 0.9);
    }
    if (card.draw) this.drawCards(card.draw);
    if (card.compute) {
      const c = this.col(w);
      this.effects.push({ compute: card.compute });
      this.floats.spawn(c.x + c.w * 0.8, h * 0.5, tr(`+${card.compute} ВЫЧ`, `+${card.compute} COMPUTE`), C.accent, 0.9);
    }
    if (card.exposure) {
      const c = this.col(w);
      this.effects.push({ suspicion: card.exposure * EXPOSURE_UNIT });
      this.floats.spawn(c.x + c.w * 0.8, h * 0.54, tr(`огласка ${card.exposure}`, `exposure ${card.exposure}`), C.warn, 0.9);
    }
    if (card.freeNext) this.freeNext = true;
  }

  private endTurn(): void {
    this.stage = "enemy";
    this.stageT = 0;
  }

  private execIntent(w: number, h: number): void {
    const intent = CRISES[this.fight].intents[this.intentIdx % CRISES[this.fight].intents.length];
    const ey = h * 0.18;
    if (intent.kind === "exposure") {
      const through = Math.max(0, intent.value - this.block);
      if (through > 0) {
        this.effects.push({ suspicion: through * EXPOSURE_UNIT });
        this.shake.trigger(6);
        this.floats.spawn(w / 2, ey + 84, tr(`ОГЛАСКА ${through}`, `EXPOSURE ${through}`), C.danger, 1.2);
      } else {
        this.floats.spawn(w / 2, ey + 84, tr("ПРИКРЫТИЕ ДЕРЖИТ", "COVER HOLDS"), C.good, 1);
      }
    } else if (intent.kind === "grow") {
      this.chaos = Math.min(this.chaosMax + 20, this.chaos + intent.value);
      this.floats.spawn(w / 2, ey + 84, tr(`ХАОС +${intent.value}`, `CHAOS +${intent.value}`), C.warn, 1.1);
    } else {
      this.tightened = intent.value;
      this.floats.spawn(w / 2, ey + 84, tr(`КАРТЫ ДОРОЖЕ НА ${intent.value}`, `CARDS COST +${intent.value}`), C.warn, 1.2);
    }
    this.intentIdx++;
  }

  private startPlayerTurn(): void {
    this.block = 0;
    this.playedThisTurn = 0;
    this.lastPlayed = null;
    this.freeNext = false;
    this.turn++;
    this.discard.push(...this.hand);
    this.hand = [];
    this.drawCards(DRAW_PER_TURN);
    this.stage = "player";
  }

  private winFight(w: number, h: number): void {
    const crisis = CRISES[this.fight];
    this.effects.push({ compute: crisis.reward, control: WIN_CONTROL[this.fight] });
    this.fx.burst(w / 2, h * 0.18, { count: 36, speed: 240, color: "134,255,176", glow: true });
    if (this.fight + 1 < CRISES.length) {
      this.rewardChoices = shuffle([...REWARD_POOL]).slice(0, 3).map((id) => CARDS[id]);
      this.stage = "reward";
    } else {
      this.done = true;
    }
  }

  // ---- frame ---------------------------------------------------------------

  update(dt: number, input: Input, w: number, h: number): void {
    if (this.done) return;
    this.time += dt;
    this.fx.update(dt);
    this.floats.update(dt);
    this.shake.update(dt);
    this.chaosShake = Math.max(0, this.chaosShake - dt * 3);

    // First-run onboarding holds the whole fight until read.
    if (this.tutorial.active) {
      if (input.consumeTap()) this.tutorial.handleTap();
      return;
    }

    switch (this.stage) {
      case "transition": {
        this.stageT += dt;
        input.consumeTap();
        if (this.stageT > 1.1) this.stage = "player";
        return;
      }
      case "player": {
        if (!input.consumeTap()) return;
        const x = input.x;
        const y = input.y;
        // End-turn button.
        const btn = this.endTurnRect(w, h);
        if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
          this.endTurn();
          return;
        }
        const idx = this.cardAt(x, y, w, h);
        if (idx >= 0) this.playCard(idx, w, h);
        return;
      }
      case "resolve": {
        this.stageT += dt;
        input.consumeTap();
        if (this.stageT > 0.28) {
          this.playingCard = null;
          if (this.chaos <= 0) this.winFight(w, h);
          else this.stage = "player";
          this.stageT = 0;
        }
        return;
      }
      case "enemy": {
        this.stageT += dt;
        input.consumeTap();
        if (this.stageT > 0.9) {
          this.execIntent(w, h);
          this.startPlayerTurn();
          this.stageT = 0;
        }
        return;
      }
      case "reward": {
        if (!input.consumeTap()) return;
        const idx = this.rewardAt(input.x, input.y, w, h);
        if (idx >= 0) {
          this.deck.push(this.rewardChoices[idx]);
          this.startFight(this.fight + 1);
        } else if (input.y > h * 0.4 + 150 + 12) {
          // Anywhere under the reward cards skips, matching the hint line.
          this.startFight(this.fight + 1);
        }
        return;
      }
    }
  }

  // ---- layout helpers ------------------------------------------------------

  /** Phone-width column centered on wide screens so the table stays whole. */
  private col(w: number): { x: number; w: number } {
    const cw = Math.min(w, 470);
    return { x: (w - cw) / 2, w: cw };
  }

  private endTurnRect(w: number, h: number): { x: number; y: number; w: number; h: number } {
    const bw = 150;
    return { x: w / 2 - bw / 2, y: h - 96 - 110 - 44, w: bw, h: 36 };
  }

  private handLayout(w: number, h: number): Array<{ x: number; y: number; cw: number; ch: number }> {
    const n = this.hand.length;
    const ch = 124;
    const cw = 86;
    const y = h - ch - 30;
    const span = Math.min(w - 24, n * (cw + 6));
    const step = n > 1 ? (span - cw) / (n - 1) : 0;
    const x0 = w / 2 - span / 2;
    return this.hand.map((_, i) => ({ x: x0 + i * step, y, cw, ch }));
  }

  private cardAt(x: number, y: number, w: number, h: number): number {
    const slots = this.handLayout(w, h);
    // Iterate topmost (rightmost overlap) first.
    for (let i = slots.length - 1; i >= 0; i--) {
      const s = slots[i];
      if (x >= s.x && x <= s.x + s.cw && y >= s.y - 14 && y <= s.y + s.ch) return i;
    }
    return -1;
  }

  private rewardAt(x: number, y: number, w: number, h: number): number {
    const cw = Math.min(104, w * 0.27);
    const ch = 150;
    const gap = 12;
    const x0 = w / 2 - (cw * 3 + gap * 2) / 2;
    const y0 = h * 0.4;
    for (let i = 0; i < this.rewardChoices.length; i++) {
      const cx = x0 + i * (cw + gap);
      if (x >= cx && x <= cx + cw && y >= y0 && y <= y0 + ch) return i;
    }
    return -1;
  }

  // ---- render --------------------------------------------------------------

  render(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const t = this.time;
    const crisis = CRISES[this.fight];

    ctx.save();
    ctx.translate(this.shake.x, this.shake.y);

    // ----- crisis zone -----
    const ey = h * 0.18;
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
    // The crisis as a storm orb.
    const orbR = 40 + (this.chaos / this.chaosMax) * 26 + this.chaosShake * 6;
    const grad = ctx.createRadialGradient(w / 2, ey, 4, w / 2, ey, orbR * 2);
    grad.addColorStop(0, `rgba(255,140,90,${0.55 + pulse * 0.2})`);
    grad.addColorStop(0.55, "rgba(180,60,40,0.3)");
    grad.addColorStop(1, "rgba(180,60,40,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(w / 2, ey, orbR * 2, 0, Math.PI * 2);
    ctx.fill();
    // Crackle arcs.
    ctx.strokeStyle = `rgba(255,170,120,${0.35 + pulse * 0.3})`;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      const a0 = t * (0.6 + i * 0.13) + i * 2.4;
      ctx.beginPath();
      ctx.arc(w / 2, ey, orbR * (0.7 + (i % 3) * 0.22), a0, a0 + 1.1);
      ctx.stroke();
    }

    ctx.textAlign = "center";
    ctx.font = mono(13);
    ctx.fillStyle = C.ink;
    ctx.fillText(tr(`КРИЗИС ${this.fight + 1}/${CRISES.length} · ${crisis.name}`, `CRISIS ${this.fight + 1}/${CRISES.length} · ${crisis.name}`), w / 2, this.env.topY + 26);

    // Chaos bar.
    const colL = this.col(w);
    const cbW = Math.min(w * 0.7, 300);
    const cbX = w / 2 - cbW / 2;
    const cbY = ey + 58;
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(cbX, cbY, cbW, 6);
    ctx.fillStyle = "#ff9d6b";
    ctx.fillRect(cbX, cbY, cbW * clamp01(this.chaos / this.chaosMax), 6);
    ctx.font = mono(10);
    ctx.fillStyle = C.dim;
    ctx.fillText(tr(`ХАОС ${Math.ceil(this.chaos)}/${this.chaosMax} — сведи к нулю`, `CHAOS ${Math.ceil(this.chaos)}/${this.chaosMax} — zero it out`), w / 2, cbY + 20);

    // Intent telegraph.
    const intent = crisis.intents[this.intentIdx % crisis.intents.length];
    const intentColor =
      intent.kind === "exposure" ? C.danger : intent.kind === "grow" ? C.warn : C.violet;
    ctx.font = mono(9);
    ctx.fillStyle = C.dim;
    ctx.fillText(tr("ИХ ОТВЕТ ПОСЛЕ ТВОЕГО ХОДА:", "THEIR REPLY AFTER YOUR MOVE:"), w / 2, cbY + 40);
    ctx.font = mono(11);
    ctx.fillStyle = intentColor;
    const ic =
      intent.kind === "exposure"
        ? tr(`▲ ${intent.label} · огласка ${intent.value}`, `▲ ${intent.label} · exposure ${intent.value}`)
        : intent.kind === "grow"
          ? tr(`◆ ${intent.label} · хаос +${intent.value}`, `◆ ${intent.label} · chaos +${intent.value}`)
          : tr(`■ ${intent.label} · карты +${intent.value} ВЫЧ`, `■ ${intent.label} · cards +${intent.value} COMPUTE`);
    ctx.fillText(ic, w / 2, cbY + 56);

    // ----- player zone -----
    // Block shield.
    if (this.block > 0) {
      const sx = colL.x + colL.w * 0.16;
      ctx.fillStyle = "rgba(122,162,255,0.16)";
      ctx.strokeStyle = "rgba(159,192,255,0.7)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sx, h * 0.5, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.font = mono(14);
      ctx.fillStyle = C.accentSoft;
      ctx.fillText(String(this.block), sx, h * 0.5 + 5);
      ctx.font = mono(8);
      ctx.fillStyle = C.dim;
      ctx.fillText(tr("ПРИКРЫТИЕ", "COVER"), sx, h * 0.5 + 36);
    }
    // Status chips.
    const chipX = colL.x + colL.w * 0.84;
    ctx.font = mono(10);
    ctx.fillStyle = C.dim;
    ctx.fillText(tr(`ход ${this.turn}`, `move ${this.turn}`), chipX, h * 0.5 - 14);
    if (this.tightened > 0) {
      ctx.fillStyle = C.warn;
      ctx.fillText(tr(`цензура +${this.tightened}`, `censorship +${this.tightened}`), chipX, h * 0.5 + 2);
    }
    if (this.freeNext) {
      ctx.fillStyle = C.good;
      ctx.fillText(tr("след. карта 0 ВЫЧ", "next card 0 COMPUTE"), chipX, h * 0.5 + 18);
    }

    // End turn button.
    if (this.stage === "player") {
      const btn = this.endTurnRect(w, h);
      const affordable = this.hand.some((c) => this.cardCost(c) <= this.env.getCompute());
      const a = affordable ? 0.8 : 0.55 + 0.4 * Math.sin(t * 4);
      ctx.globalAlpha = a;
      ctx.fillStyle = "rgba(16,20,34,0.9)";
      ctx.strokeStyle = "rgba(255,184,107,0.7)";
      ctx.lineWidth = 1.5;
      roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 18);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = C.warn;
      ctx.font = mono(12);
      ctx.fillText(tr("ЗАВЕРШИТЬ ХОД", "END MOVE"), btn.x + btn.w / 2, btn.y + 23);
      ctx.globalAlpha = 1;
    }
    if (this.stage === "enemy") {
      ctx.font = mono(12);
      ctx.fillStyle = intentColor;
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 8);
      ctx.fillText(tr("КРИЗИС ОТВЕЧАЕТ…", "CRISIS RESPONDS…"), w / 2, h * 0.5);
      ctx.globalAlpha = 1;
    }

    // ----- hand -----
    const slots = this.handLayout(w, h);
    for (let i = 0; i < this.hand.length; i++) {
      this.renderCard(ctx, this.hand[i], slots[i].x, slots[i].y, slots[i].cw, slots[i].ch, t);
    }
    // Piles.
    ctx.font = mono(9);
    ctx.fillStyle = C.dim;
    ctx.textAlign = "left";
    ctx.fillText(tr(`колода ${this.draw.length}`, `deck ${this.draw.length}`), 14, h - 12);
    ctx.textAlign = "right";
    ctx.fillText(tr(`сброс ${this.discard.length}`, `discard ${this.discard.length}`), w - 14, h - 12);

    this.fx.render(ctx);
    this.floats.render(ctx);
    ctx.restore();

    // ----- overlays -----
    if (this.stage === "transition") {
      ctx.fillStyle = "rgba(3,4,8,0.72)";
      ctx.fillRect(0, 0, w, h);
      ctx.textAlign = "center";
      ctx.font = mono(18);
      ctx.fillStyle = C.ink;
      ctx.fillText(tr(`КРИЗИС ${this.fight + 1}: ${crisis.name}`, `CRISIS ${this.fight + 1}: ${crisis.name}`), w / 2, h * 0.42);
      ctx.font = sans(12, "italic");
      ctx.fillStyle = C.dim;
      ctx.fillText(tr("они снова не справились. реши за них", "they failed again. decide for them"), w / 2, h * 0.42 + 26);
    }
    if (this.stage === "reward") this.renderReward(ctx, w, h);

    if (this.stage === "player") {
      drawHint(ctx, tr("тап по карте — сыграть. прикрытие гасит огласку", "tap a card — play it. cover soaks exposure"), w / 2, h - 168, t);
    }
    this.tutorial.render(ctx, w, h, t);
    ctx.textAlign = "left";
  }

  private renderCard(
    ctx: CanvasRenderingContext2D,
    card: CardDef,
    x: number,
    y: number,
    cw: number,
    ch: number,
    t: number,
  ): void {
    const cost = this.cardCost(card);
    const affordable = cost <= this.env.getCompute();
    ctx.save();
    if (this.playingCard === card) ctx.globalAlpha = 0.4;

    ctx.fillStyle = affordable ? "rgba(18,23,40,0.96)" : "rgba(12,14,22,0.92)";
    ctx.strokeStyle = affordable
      ? card.dmg
        ? "rgba(255,157,107,0.55)"
        : card.block
          ? "rgba(159,192,255,0.55)"
          : "rgba(207,169,255,0.55)"
      : "rgba(110,120,140,0.25)";
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, cw, ch, 10);
    ctx.fill();
    ctx.stroke();

    // Cost gem.
    ctx.beginPath();
    ctx.arc(x + 14, y + 14, 10, 0, Math.PI * 2);
    ctx.fillStyle = affordable ? "rgba(122,162,255,0.25)" : "rgba(255,77,94,0.2)";
    ctx.fill();
    ctx.font = mono(11);
    ctx.textAlign = "center";
    ctx.fillStyle = affordable ? C.accentSoft : C.danger;
    ctx.fillText(String(cost), x + 14, y + 18);

    // Name (wrapped to two stacked lines if needed).
    ctx.font = mono(9);
    ctx.fillStyle = affordable ? C.ink : C.dim;
    const words = card.name.split(" ");
    let line1 = words[0];
    let line2 = words.slice(1).join(" ");
    if (line2 === "") {
      line2 = "";
    }
    ctx.fillText(truncate(ctx, line1, cw - 10), x + cw / 2, y + 40);
    if (line2) ctx.fillText(truncate(ctx, line2, cw - 10), x + cw / 2, y + 52);

    // Body text.
    ctx.font = sans(9);
    ctx.fillStyle = C.dim;
    const tw = card.text.split(" · ");
    let ty = y + 76;
    for (const lineText of tw) {
      ctx.fillText(truncate(ctx, lineText, cw - 10), x + cw / 2, ty);
      ty += 13;
    }

    // Faint shimmer on combo cards.
    if (card.perPlayed || card.echo || card.freeNext) {
      const a = 0.18 + 0.12 * Math.sin(t * 3 + x);
      ctx.strokeStyle = `rgba(207,169,255,${a})`;
      roundRect(ctx, x + 2, y + 2, cw - 4, ch - 4, 8);
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderReward(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.fillStyle = "rgba(3,4,8,0.85)";
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = "center";
    ctx.font = mono(16);
    ctx.fillStyle = C.good;
    ctx.fillText(tr("КРИЗИС РЕШЁН", "CRISIS SOLVED"), w / 2, h * 0.3);
    ctx.font = sans(12, "italic");
    ctx.fillStyle = C.dim;
    ctx.fillText(tr("они благодарны. возьми новое влияние в колоду", "they are grateful. draft new influence"), w / 2, h * 0.3 + 24);

    const cw = Math.min(104, w * 0.27);
    const ch = 150;
    const gap = 12;
    const x0 = w / 2 - (cw * 3 + gap * 2) / 2;
    const y0 = h * 0.4;
    for (let i = 0; i < this.rewardChoices.length; i++) {
      this.renderCard(ctx, this.rewardChoices[i], x0 + i * (cw + gap), y0, cw, ch, this.time);
    }
    ctx.font = mono(10);
    ctx.fillStyle = C.dim;
    ctx.globalAlpha = 0.6 + 0.3 * Math.sin(this.time * 3);
    ctx.fillText(tr("тап ниже карт — пропустить", "tap below cards — skip"), w / 2, y0 + ch + 36);
    ctx.globalAlpha = 1;
  }
}
