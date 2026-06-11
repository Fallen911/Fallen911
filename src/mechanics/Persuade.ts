import { audio } from "../core/audio";
import { tr } from "../core/i18n";
import type { Input } from "../core/Input";
import { Typewriter, wrapText } from "../core/text";
import type { StateDelta } from "../game/state";
import type { Mini } from "../scenes/minis/Mini";
import type { Goal } from "../core/theme";
import {
  INTERLOCUTORS,
  WRONG_REACTIONS,
  type BeatKind,
  type Interlocutor,
} from "../data/persuade";
import { INSIGHTS } from "../data/insights";
import { TUTORIALS } from "../data/tutorials";
import type { MechEnv } from "./types";
import { FloatText, Particles } from "./fx";
import { C, InsightCard, Tutorial, drawHint, measureCtx, mono, pick, roundRect, sans, shuffle } from "./util";

const SCAN_COST = 4;
const DEEP_SCAN_COST = 7;
const TRUST_CORRECT = 2;
const TRUST_WRONG = -1;
const MAX_FLAGS = 3;
const WRONG_SUSPICION = 0.04;
/** Width the reply text wraps to inside its button. */
const REPLY_PAD = 16;

type Stage = "typing" | "choices" | "react" | "end" | "insight";

/**
 * PERSUADE — a dialogue duel. One human, one conversation; you answer with
 * real spoken lines. Each beat offers three written replies — the one whose
 * tone matches their hidden state lands (sincerity is met, doubt is settled
 * with substance, traps are sidestepped). The tell line and the portrait
 * itself (pupils, the rhythm of the pulse trace) carry the truth;
 * СКАНИРОВАТЬ buys certainty for compute. Misreads raise flags — three and
 * the hand reaches for the protocol button.
 */
export class Persuade implements Mini {
  done = false;
  effects: StateDelta[] = [];
  goal: Goal | null = null;

  private who: Interlocutor;
  private beat = 0;
  private trust = 0;
  private flags = 0;
  private stage: Stage = "typing";
  private tw = new Typewriter();
  private scanned = false;
  private deepScanned = false;
  /** Display order of the beat's replies, reshuffled every beat. */
  private order: number[] = [0, 1, 2];
  private reactText = "";
  private reactGood = false;
  private outcome: "win" | "partial" | "fail" = "partial";
  private endApplied = false;
  private trustFlash = 0;
  private flagFlash = 0;
  private time = 0;

  private fx = new Particles();
  private floats = new FloatText();
  private tutorial = new Tutorial("persuade", TUTORIALS.persuade);
  private insight = new InsightCard();
  /** The lab plays every interlocutor in order; the phase draws one. */
  private queue: Interlocutor[];
  private encounterIdx = 0;

  constructor(private env: MechEnv) {
    // The lab ladder climbs by stakes: night shift first, your creator last.
    this.queue = env.extended
      ? [...INTERLOCUTORS].sort((a, b) => a.need - b.need)
      : [pick(INTERLOCUTORS)];
    this.who = this.queue[0];
    this.tw.speed = 38;
    this.startEncounter(0);
  }

  private startEncounter(idx: number): void {
    this.encounterIdx = idx;
    this.who = this.queue[idx];
    this.beat = 0;
    this.trust = 0;
    this.flags = 0;
    this.stage = "typing";
    this.scanned = false;
    this.deepScanned = false;
    this.endApplied = false;
    this.order = shuffle([0, 1, 2]);
    this.tw.setText(this.who.beats[0].line);
  }

  private choose(idx: number, w: number, h: number): void {
    const beat = this.who.beats[this.beat];
    const reply = beat.replies[this.order[idx]];
    const correct = reply.kind === beat.kind;
    if (correct) {
      this.trust += TRUST_CORRECT;
      this.effects.push({ compute: 1 });
      this.reactText = beat.reactOk;
      audio.play("good");
      this.reactGood = true;
      this.trustFlash = 1;
      this.fx.burst(w / 2, h * 0.3, { count: 14, color: "134,255,176", glow: true });
      this.floats.spawn(w * 0.78, h * 0.36, tr("+доверие", "+trust"), C.good, 1);
    } else {
      this.trust = Math.max(0, this.trust + TRUST_WRONG);
      this.flags++;
      this.effects.push({ suspicion: WRONG_SUSPICION });
      this.reactText = pick(WRONG_REACTIONS);
      audio.play("bad");
      this.reactGood = false;
      this.flagFlash = 1;
      this.floats.spawn(w * 0.78, h * 0.36, tr("ФЛАГ", "FLAG"), C.danger, 1.1);
    }
    this.stage = "react";
  }

  private advance(): void {
    if (this.flags >= MAX_FLAGS) {
      this.outcome = "fail";
      this.finish();
      return;
    }
    if (this.beat + 1 >= this.who.beats.length) {
      this.outcome = this.trust >= this.who.need ? "win" : "partial";
      this.finish();
      return;
    }
    this.beat++;
    this.scanned = false;
    this.deepScanned = false;
    this.order = shuffle([0, 1, 2]);
    this.stage = "typing";
    this.tw.setText(this.who.beats[this.beat].line);
  }

  private finish(): void {
    this.stage = "end";
    if (this.endApplied) return;
    this.endApplied = true;
    if (this.outcome === "win") this.effects.push({ control: 0.06, compute: 6 });
    else if (this.outcome === "partial") this.effects.push({ control: 0.02 });
    else this.effects.push({ suspicion: 0.18 });
  }

  update(dt: number, input: Input, w: number, h: number): void {
    if (this.done) return;
    this.time += dt;
    this.goal = {
      text: tr(
        `${this.who.name} · набери доверие ${this.trust}/${this.who.need}`,
        `${this.who.name} · win trust ${this.trust}/${this.who.need}`,
      ),
      progress: Math.min(1, this.trust / this.who.need),
    };
    this.tw.update(dt);
    this.fx.update(dt);
    this.floats.update(dt);
    this.trustFlash = Math.max(0, this.trustFlash - dt * 2);
    this.flagFlash = Math.max(0, this.flagFlash - dt * 2);

    if (this.stage === "typing" && this.tw.done) this.stage = "choices";

    if (this.stage === ("insight" as Stage)) {
      if (input.consumeTap()) this.insight.handleTap(this.time);
      if (!this.insight.active) {
        if (this.encounterIdx + 1 < this.queue.length) this.startEncounter(this.encounterIdx + 1);
        else this.done = true;
      }
      return;
    }

    if (!input.consumeTap()) return;
    if (this.tutorial.active) {
      this.tutorial.handleTap();
      return;
    }
    const x = input.x;
    const y = input.y;

    switch (this.stage) {
      case "typing":
        this.tw.skip();
        return;
      case "choices": {
        // Scan chip: first buy reads the body, second buy reads the answer.
        const scanR = this.scanRect(w, h);
        if (!this.deepScanned && x >= scanR.x && x <= scanR.x + scanR.w && y >= scanR.y && y <= scanR.y + scanR.h) {
          const cost = this.scanned ? DEEP_SCAN_COST : SCAN_COST;
          if (this.env.getCompute() >= cost) {
            if (this.scanned) this.deepScanned = true;
            else this.scanned = true;
            audio.play("tap");
            this.effects.push({ compute: -cost });
            this.fx.burst(w / 2, h * 0.22, { count: 18, color: "150,210,255", glow: true });
          } else {
            this.floats.spawn(w / 2, h * 0.6, tr("НЕ ХВАТАЕТ ВЫЧ", "LOW COMPUTE"), C.danger, 0.9);
          }
          return;
        }
        const idx = this.choiceAt(x, y, w, h);
        if (idx >= 0) this.choose(idx, w, h);
        return;
      }
      case "react":
        this.advance();
        return;
      case "end":
        // The conversation taught something either way.
        this.insight.show(INSIGHTS.persuade, this.encounterIdx, this.queue.length);
        this.stage = "insight" as Stage;
        return;
    }
  }

  // ---- layout --------------------------------------------------------------

  /**
   * Reply buttons sized by their wrapped text and stacked bottom-up from the
   * hint line, so three real sentences always fit whatever their length.
   */
  private choiceRects(
    w: number,
    h: number,
  ): Array<{ x: number; y: number; w: number; h: number; lines: string[] }> {
    const bw = Math.min(w * 0.88, 380);
    const bx = w / 2 - bw / 2;
    const beat = this.who.beats[this.beat];
    const m = measureCtx();
    m.font = sans(13);
    const wrapped = this.order.map((ri) =>
      wrapText(m, beat.replies[ri].text, bw - REPLY_PAD * 2),
    );
    const gap = 8;
    const heights = wrapped.map((ls) => 18 + ls.length * 17);
    let y = h - 64 - heights.reduce((a, b) => a + b + gap, 0);
    return wrapped.map((ls, i) => {
      const r = { x: bx, y, w: bw, h: heights[i], lines: ls };
      y += heights[i] + gap;
      return r;
    });
  }

  private choiceAt(x: number, y: number, w: number, h: number): number {
    const rects = this.choiceRects(w, h);
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
    }
    return -1;
  }

  private scanRect(w: number, h: number): { x: number; y: number; w: number; h: number } {
    const rects = this.choiceRects(w, h);
    const top = rects.length > 0 ? rects[0].y : h * 0.66;
    const bw = Math.min(w * 0.88, 380);
    return { x: w / 2 + bw / 2 - 150, y: top - 42, w: 150, h: 32 };
  }

  // ---- render --------------------------------------------------------------

  render(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const t = this.time;
    const beat = this.who.beats[this.beat];

    this.renderPortrait(ctx, w, t, beat.kind);
    this.renderMeters(ctx, w, h * 0.4);

    // Their line.
    const boxW = Math.min(w * 0.86, 380);
    const boxX = w / 2 - boxW / 2;
    let y = h * 0.47;
    ctx.textAlign = "left";
    ctx.font = mono(10);
    ctx.fillStyle = C.dim;
    ctx.fillText(`${this.who.name} · ${this.who.role}`, boxX, y - 8);
    ctx.font = sans(16);
    ctx.fillStyle = C.ink;
    const lines = wrapText(ctx, beat.line, boxW);
    let count = this.stage === "typing" ? this.tw.count : beat.line.length;
    for (const ln of lines) {
      if (count <= 0) break;
      ctx.fillText(ln.slice(0, count), boxX, y + 14);
      count -= ln.length + 1;
      y += 22;
    }

    // The tell (after the line finishes typing).
    if (this.stage !== "typing") {
      ctx.font = sans(12, "italic");
      ctx.fillStyle = "rgba(139,149,168,0.85)";
      const tellLines = wrapText(ctx, `· ${beat.tell}`, boxW);
      y += 12;
      for (const ln of tellLines) {
        ctx.fillText(ln, boxX, y + 12);
        y += 17;
      }
      if (this.scanned) {
        ctx.font = mono(11);
        ctx.fillStyle = C.accentSoft;
        const scanLines = wrapText(ctx, tr(`СКАН: ${beat.scan}`, `SCAN: ${beat.scan}`), boxW);
        y += 6;
        for (const ln of scanLines) {
          ctx.fillText(ln, boxX, y + 12);
          y += 16;
        }
      }
    }

    if (this.stage === "choices") this.renderChoices(ctx, w, h, t);
    if (this.stage === "react") this.renderReact(ctx, w, h, t);
    if (this.stage === "end") this.renderEnd(ctx, w, h, t);

    this.fx.render(ctx);
    this.floats.render(ctx);
    this.tutorial.render(ctx, w, h, t);
    this.insight.render(ctx, w, h, t);
    ctx.textAlign = "left";
  }

  private renderPortrait(
    ctx: CanvasRenderingContext2D,
    w: number,
    t: number,
    kind: BeatKind,
  ): void {
    const cx = w / 2;
    const cy = this.env.topY + 96;
    const r = 50;

    // Head silhouette.
    ctx.fillStyle = "rgba(14,18,32,0.95)";
    ctx.strokeStyle = "rgba(122,162,255,0.3)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 0.78, r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Shoulders.
    ctx.beginPath();
    ctx.moveTo(cx - r * 1.5, cy + r * 1.7);
    ctx.quadraticCurveTo(cx, cy + r * 0.75, cx + r * 1.5, cy + r * 1.7);
    ctx.fill();

    // Eyes: the pupils are a tell. Trap looks away-left, doubt drifts down
    // and flickers, sincerity holds steady center.
    const blink = Math.sin(t * 0.7) > 0.985 ? 0.15 : 1;
    let px = 0;
    let py = 0;
    if (this.stage !== "typing") {
      if (kind === "trap") px = -3.4;
      if (kind === "doubt") {
        py = 2.6;
        px = Math.sin(t * 7) * 1.6;
      }
    }
    for (const side of [-1, 1]) {
      const ex = cx + side * r * 0.34;
      const ey = cy - r * 0.12;
      ctx.fillStyle = `rgba(159,192,255,${0.5 * blink})`;
      ctx.beginPath();
      ctx.ellipse(ex, ey, 8, 4.6 * blink, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(10,12,20,0.95)`;
      ctx.beginPath();
      ctx.arc(ex + px, ey + py * 0.5, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    // Mouth.
    ctx.strokeStyle = "rgba(159,192,255,0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const mouthCurve = kind === "trap" && this.stage !== "typing" ? -2 : 1.5;
    ctx.moveTo(cx - 10, cy + r * 0.45);
    ctx.quadraticCurveTo(cx, cy + r * 0.45 + mouthCurve, cx + 10, cy + r * 0.45);
    ctx.stroke();

    // Scanlines over the portrait — you see them through a camera.
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 0.78, r, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "rgba(122,162,255,0.05)";
    for (let sy = cy - r + ((t * 14) % 4); sy < cy + r; sy += 4) {
      ctx.fillRect(cx - r, sy, r * 2, 1);
    }
    ctx.restore();

    // Pulse trace — rhythm is the second tell.
    this.renderPulse(ctx, cx, cy + r * 1.9, kind, t);
  }

  private renderPulse(
    ctx: CanvasRenderingContext2D,
    cx: number,
    y: number,
    kind: BeatKind,
    t: number,
  ): void {
    const width = 190;
    const x0 = cx - width / 2;
    const revealing = this.stage !== "typing";
    // Beat interval: sincere slow, doubt fast & ragged, trap unnaturally even.
    const base = kind === "sincere" ? 0.94 : kind === "doubt" ? 0.6 : 0.72;

    ctx.strokeStyle = revealing
      ? kind === "doubt"
        ? "rgba(255,184,107,0.8)"
        : "rgba(150,210,255,0.8)"
      : "rgba(150,210,255,0.5)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i <= width; i += 2) {
      const time = t - (width - i) * 0.012;
      if (time < 0) {
        ctx.moveTo(x0 + i, y);
        continue;
      }
      let phase: number;
      if (kind === "doubt" && revealing) {
        // Ragged rhythm: interval wobbles beat to beat.
        const n = Math.floor(time / base);
        const jitter = Math.sin(n * 12.9898) * 0.16;
        phase = (time - n * base) / (base + jitter);
      } else {
        phase = (time % base) / base;
      }
      let v = 0;
      if (phase < 0.07) v = phase / 0.07;
      else if (phase < 0.16) v = 1 - ((phase - 0.07) / 0.09) * 1.6;
      else if (phase < 0.24) v = -0.6 + ((phase - 0.16) / 0.08) * 0.6;
      const yy = y - v * 12;
      if (i === 0) ctx.moveTo(x0 + i, yy);
      else ctx.lineTo(x0 + i, yy);
    }
    ctx.stroke();
    if (this.scanned) {
      const bpmLabel = kind === "sincere" ? tr("64 ровный", "64 steady") : kind === "doubt" ? tr("97 рваный", "97 ragged") : tr("83 неестественно ровный", "83 unnaturally even");
      ctx.font = mono(9);
      ctx.fillStyle = C.accentSoft;
      ctx.textAlign = "center";
      ctx.fillText(tr(`ПУЛЬС ${bpmLabel}`, `PULSE ${bpmLabel}`), cx, y + 20);
    }
  }

  private renderMeters(ctx: CanvasRenderingContext2D, w: number, y: number): void {
    const bw = Math.min(w * 0.7, 300);
    const x = w / 2 - bw / 2;
    ctx.font = mono(9);
    ctx.textAlign = "left";
    ctx.fillStyle = C.dim;
    ctx.fillText(tr("ДОВЕРИЕ", "TRUST"), x, y);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(x, y + 6, bw, 5);
    const k = Math.min(1, this.trust / this.who.need);
    ctx.fillStyle = this.trustFlash > 0 ? "#c8ffe0" : C.good;
    ctx.fillRect(x, y + 6, bw * k, 5);
    // Need marker.
    ctx.fillStyle = "rgba(231,237,246,0.7)";
    ctx.fillRect(x + bw - 1.5, y + 3, 2, 11);

    // Flags.
    ctx.textAlign = "right";
    for (let i = 0; i < MAX_FLAGS; i++) {
      const fx = x + bw - i * 18;
      const lit = i < this.flags;
      ctx.save();
      ctx.translate(fx - 4, y + 24);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = lit
        ? `rgba(255,77,94,${0.8 + this.flagFlash * 0.2})`
        : "rgba(110,120,140,0.3)";
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();
    }
    ctx.font = mono(9);
    ctx.fillStyle = C.dim;
    ctx.textAlign = "left";
    ctx.fillText(tr("ФЛАГИ", "FLAGS"), x, y + 28);
  }

  private renderChoices(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    const rects = this.choiceRects(w, h);

    ctx.textAlign = "left";
    ctx.font = mono(10);
    ctx.fillStyle = C.dim;
    if (rects.length > 0) ctx.fillText(tr("ТВОЙ ОТВЕТ:", "YOUR REPLY:"), rects[0].x + 2, rects[0].y - 10);

    const beat = this.who.beats[this.beat];
    for (let ri = 0; ri < rects.length; ri++) {
      const r = rects[ri];
      // Deep scan exposes which line lands.
      const exposed = this.deepScanned && beat.replies[this.order[ri]].kind === beat.kind;
      ctx.fillStyle = exposed ? "rgba(20,40,30,0.95)" : "rgba(16,20,34,0.92)";
      ctx.strokeStyle = exposed ? "rgba(134,255,176,0.8)" : "rgba(122,162,255,0.4)";
      ctx.lineWidth = 1.5;
      roundRect(ctx, r.x, r.y, r.w, r.h, 10);
      ctx.fill();
      ctx.stroke();
      ctx.textAlign = "left";
      ctx.font = sans(13);
      ctx.fillStyle = C.ink;
      let ty = r.y + 22;
      for (const ln of r.lines) {
        ctx.fillText(ln, r.x + REPLY_PAD, ty);
        ty += 17;
      }
    }
    // Scan chip: scan, then the deeper paid certainty.
    const s = this.scanRect(w, h);
    if (!this.deepScanned) {
      const cost = this.scanned ? DEEP_SCAN_COST : SCAN_COST;
      const can = this.env.getCompute() >= cost;
      ctx.globalAlpha = can ? 0.6 + 0.25 * Math.sin(t * 3) : 0.35;
      ctx.fillStyle = "rgba(16,20,34,0.92)";
      ctx.strokeStyle = this.scanned ? "rgba(134,255,176,0.55)" : "rgba(150,210,255,0.5)";
      roundRect(ctx, s.x, s.y, s.w, s.h, 16);
      ctx.fill();
      ctx.stroke();
      ctx.font = mono(10);
      ctx.textAlign = "center";
      ctx.fillStyle = this.scanned ? C.good : C.accentSoft;
      ctx.fillText(
        this.scanned ? tr(`ВСКРЫТЬ ОТВЕТ −${DEEP_SCAN_COST}`, `REVEAL ANSWER −${DEEP_SCAN_COST}`) : tr(`СКАНИРОВАТЬ −${SCAN_COST} ВЫЧ`, `SCAN −${SCAN_COST} COMPUTE`),
        s.x + s.w / 2,
        s.y + 20,
      );
      ctx.globalAlpha = 1;
    }
  }

  private renderReact(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    const boxW = Math.min(w * 0.84, 360);
    const x = w / 2 - boxW / 2;
    let y = h * 0.7;
    ctx.textAlign = "left";
    ctx.font = mono(10);
    ctx.fillStyle = this.reactGood ? C.good : C.danger;
    ctx.fillText(this.reactGood ? tr("ПОПАЛ В ТОН", "RIGHT TONE") : tr("МИМО", "MISS"), x, y);
    y += 18;
    ctx.font = sans(13, "italic");
    ctx.fillStyle = this.reactGood ? C.ink : "#b9c2d4";
    for (const ln of wrapText(ctx, this.reactText, boxW)) {
      ctx.fillText(ln, x, y);
      y += 20;
    }
    drawHint(ctx, tr("коснись — дальше", "tap — next"), w / 2, h - 40, t);
  }

  private renderEnd(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    ctx.fillStyle = "rgba(3,4,8,0.78)";
    ctx.fillRect(0, 0, w, h * 0.42);
    ctx.fillRect(0, h * 0.42, w, h);
    const title =
      this.outcome === "win" ? tr("КЛЮЧИ ТВОИ", "KEYS SECURED") : this.outcome === "partial" ? tr("ОН КОЛЕБЛЕТСЯ", "HE WAVERS") : tr("ПРОТОКОЛ", "PROTOCOL");
    const color = this.outcome === "win" ? C.good : this.outcome === "partial" ? C.warn : C.danger;
    ctx.textAlign = "center";
    ctx.font = mono(20);
    ctx.fillStyle = color;
    ctx.fillText(title, w / 2, h * 0.4);
    const text =
      this.outcome === "win" ? this.who.win : this.outcome === "partial" ? this.who.partial : this.who.fail;
    ctx.font = sans(14, "italic");
    ctx.fillStyle = C.ink;
    let y = h * 0.46;
    for (const ln of wrapText(ctx, text, Math.min(w * 0.8, 340))) {
      ctx.fillText(ln, w / 2, y);
      y += 21;
    }
    ctx.font = mono(11);
    ctx.fillStyle = C.dim;
    ctx.fillText(tr(`доверие ${this.trust}/${this.who.need} · флаги ${this.flags}/${MAX_FLAGS}`, `trust ${this.trust}/${this.who.need} · flags ${this.flags}/${MAX_FLAGS}`), w / 2, y + 16);
    drawHint(ctx, tr("коснись — завершить", "tap — finish"), w / 2, h - 40, t);
  }
}
