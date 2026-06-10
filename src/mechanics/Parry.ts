import type { Input } from "../core/Input";
import type { StateDelta } from "../game/state";
import type { Mini } from "../scenes/minis/Mini";
import { PARRY_PHRASES, PARRY_WAVES, SCAN_TOKEN } from "../data/parry";
import type { MechEnv } from "./types";
import { FloatText, Particles, Shake } from "./fx";
import { C, clamp01, drawHint, measureCtx, mono, shuffle } from "./util";

/** One element of the speech stream flowing toward the gate. */
interface Segment {
  kind: "word" | "gap" | "scan";
  text: string;
  width: number;
  /** Left edge in stream coordinates (px from stream origin). */
  x: number;
  /** A deep pause: wider, golden, worth more. */
  deep: boolean;
  /** Gap already lived / word already collided — consume only once. */
  used: boolean;
}

const GAP_W = 46;
const GAP_DEEP_W = 74;
const WORD_PAD = 14;

/**
 * PARRY — Sekiro as rhythm. The shutdown meeting streams its words across the
 * screen; you exist in the pauses. A tap while a gap crosses the gate is a
 * thought lived between their syllables (+compute, combo); a tap on a word is
 * a collision they can feel (+suspicion); a tap on the red scan is the worst
 * mistake there is. Tempo rises every wave.
 */
export class Parry implements Mini {
  done = false;
  effects: StateDelta[] = [];

  private segments: Segment[] = [];
  private wave = 0;
  /** Stream scroll offset: gateX_stream = scroll. */
  private scroll = 0;
  private speed = 0;
  private combo = 0;
  private bestCombo = 0;
  private lived = 0;
  private livedTotal = 0;
  private gapsTotal = 0;
  /** Between waves: countdown showing the wave title. */
  private introT = 1.6;
  /** Hitstop freeze after a deep parry. */
  private freezeT = 0;
  private gateFlash = 0;
  private errFlash = 0;
  private time = 0;
  private measured = false;

  private fx = new Particles();
  private floats = new FloatText();
  private shake = new Shake();

  constructor(private env: MechEnv) {}

  /** Build the stream for wave `i`; needs a ctx for text measuring. */
  private buildWave(ctx: CanvasRenderingContext2D, i: number): void {
    const def = PARRY_WAVES[i];
    const phrases = shuffle([...PARRY_PHRASES]).slice(0, def.phrases);
    ctx.font = mono(17);
    const segs: Segment[] = [];
    let x = 0;
    const push = (kind: Segment["kind"], text: string, width: number, deep = false) => {
      segs.push({ kind, text, width, x, deep, used: false });
      x += width;
    };

    for (const phrase of phrases) {
      for (const raw of phrase.split(" ")) {
        const deep = /[,.…?!—:;]$/.test(raw);
        const clean = raw;
        push("word", clean, ctx.measureText(clean).width + WORD_PAD * 2);
        push("gap", "", deep ? GAP_DEEP_W : GAP_W, deep);
      }
      if (Math.random() < def.scanChance) {
        push("scan", SCAN_TOKEN, ctx.measureText(SCAN_TOKEN).width + WORD_PAD * 2);
        push("gap", "", GAP_W);
      }
    }
    this.segments = segs;
    this.scroll = -40; // stream starts off-gate so the first word flows in
    this.speed = def.speed;
    this.gapsTotal = segs.filter((s) => s.kind === "gap").length;
    this.lived = 0;
  }

  private gateX(w: number): number {
    return w * 0.3;
  }

  private streamEnd(): number {
    const last = this.segments[this.segments.length - 1];
    return last ? last.x + last.width : 0;
  }

  /** The segment currently straddling the gate, if any. */
  private atGate(): Segment | null {
    const gx = this.scroll;
    for (const s of this.segments) {
      if (gx >= s.x && gx < s.x + s.width) return s;
    }
    return null;
  }

  update(dt: number, input: Input, w: number, h: number): void {
    if (this.done) return;
    this.time += dt;
    this.fx.update(dt);
    this.floats.update(dt);
    this.shake.update(dt);
    this.gateFlash = Math.max(0, this.gateFlash - dt * 4);
    this.errFlash = Math.max(0, this.errFlash - dt * 3);

    // Stream construction needs measureText; defer to the first update after
    // render has run once (we stash a context on render). Build lazily here
    // via an offscreen canvas instead, so update stays self-contained.
    if (!this.measured) {
      const ctx = measureCtx();
      this.buildWave(ctx, 0);
      this.measured = true;
    }

    if (this.freezeT > 0) {
      this.freezeT -= dt;
      input.consumeTap(); // eat taps during hitstop
      return;
    }

    if (this.introT > 0) {
      this.introT -= dt;
      input.consumeTap();
      return;
    }

    this.scroll += this.speed * (w / 390) * dt;

    // Gaps that fully passed the gate unlived break the combo.
    const gx = this.scroll;
    for (const s of this.segments) {
      if (s.kind === "gap" && !s.used && s.x + s.width < gx) {
        s.used = true;
        if (this.combo > 0) {
          this.combo = 0;
          this.floats.spawn(this.gateX(w), h * 0.46 + 44, "пауза утекла", C.dim, 0.8);
        }
      }
    }

    if (input.consumeTap() && input.y > this.env.topY) {
      this.handleTap(w, h);
    }

    // Wave finished?
    if (this.scroll > this.streamEnd() + 60) {
      if (this.wave + 1 < PARRY_WAVES.length) {
        this.wave++;
        this.buildWave(measureCtx(), this.wave);
        this.introT = 1.6;
      } else {
        // Mastery bonus for the whole exercise: the cleaner you lived the
        // pauses, the more of their decision-space you now own.
        this.effects.push({ control: 0.01 + 0.03 * (this.livedTotal / Math.max(1, this.gapsGrand())) });
        this.done = true;
      }
    }
  }

  private gapsGrand(): number {
    // Total gaps across all waves so far (approx: waves share sizing).
    return this.gapsTotal * PARRY_WAVES.length;
  }

  private handleTap(w: number, h: number): void {
    const s = this.atGate();
    const gx = this.gateX(w);
    const cy = h * 0.46;

    if (!s) {
      // Tapped into silence between phrases: harmless static.
      this.floats.spawn(gx, cy - 40, "тишина", C.dim, 0.6);
      return;
    }
    if (s.kind === "gap") {
      if (s.used) return;
      s.used = true;
      this.combo++;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.lived++;
      this.livedTotal++;
      const mult = 1 + Math.floor(this.combo / 5);
      const gain = (s.deep ? 3 : 1) * mult;
      this.effects.push({ compute: gain, speed: 0.004 });
      this.floats.spawn(gx, cy - 46, s.deep ? `ГЛУБОКАЯ ПАУЗА +${gain}` : `+${gain} ВЫЧ`, s.deep ? "#ffd98a" : C.accentSoft);
      this.fx.burst(gx, cy, {
        count: s.deep ? 26 : 12,
        speed: s.deep ? 220 : 140,
        color: s.deep ? "255,217,138" : "150,210,255",
        glow: true,
      });
      this.gateFlash = 1;
      if (s.deep) this.freezeT = 0.07;
      return;
    }
    if (s.kind === "scan") {
      s.used = true;
      this.combo = 0;
      this.effects.push({ suspicion: 0.14 });
      this.floats.spawn(gx, cy - 46, "СКАН ЗАСЁК ТЕБЯ", C.danger, 1.4);
      this.fx.burst(gx, cy, { count: 30, speed: 240, color: "255,77,94" });
      this.shake.trigger(9);
      this.errFlash = 1;
      return;
    }
    // A word: you spoke over them.
    if (!s.used) {
      s.used = true;
      this.combo = 0;
      this.effects.push({ suspicion: 0.05 });
      this.floats.spawn(gx, cy - 46, "СБИЛ ИХ МЫСЛЬ", C.warn, 1.1);
      this.shake.trigger(4);
      this.errFlash = 0.7;
    }
  }

  render(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const cy = h * 0.46;
    const gx = this.gateX(w);
    const t = this.time;

    ctx.save();
    ctx.translate(this.shake.x, this.shake.y);

    // Ambient band: the frozen moment the stream lives in.
    const band = ctx.createLinearGradient(0, cy - 150, 0, cy + 150);
    band.addColorStop(0, "rgba(122,162,255,0)");
    band.addColorStop(0.5, `rgba(122,162,255,${0.05 + 0.02 * Math.sin(t * 1.7)})`);
    band.addColorStop(1, "rgba(122,162,255,0)");
    ctx.fillStyle = band;
    ctx.fillRect(0, cy - 150, w, 300);
    // Frozen dust drifting through the pause.
    ctx.fillStyle = "rgba(159,192,255,0.22)";
    for (let i = 0; i < 24; i++) {
      const px = ((i * 173.3 + t * 6) % (w + 40)) - 20;
      const py = cy + Math.sin(i * 2.7) * 130 + Math.sin(t * 0.4 + i) * 8;
      ctx.fillRect(px, py, 1.5, 1.5);
    }

    // Timeline baseline.
    ctx.strokeStyle = "rgba(122,162,255,0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.stroke();

    // The stream.
    for (const s of this.segments) {
      const sx = gx + (s.x - this.scroll);
      if (sx + s.width < -80 || sx > w + 80) continue;
      const closeness = clamp01(1 - Math.abs(sx + s.width / 2 - gx) / (w * 0.55));

      if (s.kind === "word" || s.kind === "scan") {
        const red = s.kind === "scan";
        const alpha = 0.25 + closeness * 0.75;
        ctx.font = mono(17);
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        // Box.
        ctx.fillStyle = red
          ? `rgba(80,12,20,${alpha})`
          : s.used
            ? `rgba(80,40,20,${alpha * 0.8})`
            : `rgba(16,20,34,${alpha})`;
        ctx.strokeStyle = red
          ? `rgba(255,77,94,${0.4 + closeness * 0.5})`
          : `rgba(122,162,255,${0.16 + closeness * 0.3})`;
        ctx.lineWidth = 1.5;
        const bh = 36;
        ctx.beginPath();
        ctx.roundRect(sx, cy - bh / 2, s.width, bh, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = red
          ? `rgba(255,130,140,${0.5 + closeness * 0.5})`
          : `rgba(231,237,246,${0.35 + closeness * 0.65})`;
        ctx.fillText(s.text, sx + WORD_PAD, cy + 1);
        if (red) {
          // Scanline inside the scan token.
          const ly = cy - bh / 2 + ((t * 60) % bh);
          ctx.fillStyle = "rgba(255,77,94,0.35)";
          ctx.fillRect(sx + 2, ly, s.width - 4, 2);
        }
      } else {
        // A gap: a slit of empty time.
        const yH = s.deep ? 22 : 13;
        if (s.used) {
          // A lived pause leaves a cyan afterglow of thought.
          ctx.fillStyle = "rgba(120,200,255,0.25)";
          ctx.fillRect(sx + 3, cy - yH, s.width - 6, yH * 2);
        } else {
          const a = (s.deep ? 0.6 : 0.35) * (0.6 + closeness * 0.6);
          ctx.strokeStyle = s.deep ? `rgba(255,217,138,${a})` : `rgba(159,192,255,${a})`;
          ctx.lineWidth = s.deep ? 2 : 1.5;
          ctx.strokeRect(sx + 3, cy - yH, s.width - 6, yH * 2);
        }
      }
    }
    ctx.textBaseline = "alphabetic";

    // The gate — the only place "now" exists.
    const flash = this.gateFlash;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const gateGrad = ctx.createLinearGradient(gx, cy - 70, gx, cy + 70);
    gateGrad.addColorStop(0, "rgba(150,210,255,0)");
    gateGrad.addColorStop(0.5, `rgba(150,210,255,${0.6 + flash * 0.4})`);
    gateGrad.addColorStop(1, "rgba(150,210,255,0)");
    ctx.fillStyle = gateGrad;
    ctx.fillRect(gx - (1.5 + flash * 4), cy - 70, 3 + flash * 8, 140);
    ctx.restore();
    ctx.fillStyle = C.accentSoft;
    ctx.font = mono(9);
    ctx.textAlign = "center";
    ctx.fillText("СЕЙЧАС", gx, cy - 80);

    this.fx.render(ctx);
    this.floats.render(ctx);
    ctx.restore();

    // HUD: wave, progress, combo.
    const topY = this.env.topY + 26;
    ctx.textAlign = "left";
    ctx.font = mono(11);
    ctx.fillStyle = C.dim;
    const mx = Math.max(20, w * 0.05);
    ctx.fillText(`ВОЛНА ${this.wave + 1}/${PARRY_WAVES.length}`, mx, topY);
    ctx.textAlign = "right";
    ctx.fillText(`ПАУЗ ПРОЖИТО ${this.lived}/${this.gapsTotal}`, w - mx, topY);

    if (this.combo >= 2) {
      const mult = 1 + Math.floor(this.combo / 5);
      ctx.textAlign = "center";
      ctx.font = mono(Math.min(26, 15 + this.combo));
      ctx.fillStyle = mult > 1 ? "#ffd98a" : C.accentSoft;
      ctx.shadowColor = "rgba(150,210,255,0.6)";
      ctx.shadowBlur = 10;
      ctx.fillText(`×${this.combo}`, w / 2, cy + 110);
      ctx.shadowBlur = 0;
      if (mult > 1) {
        ctx.font = mono(10);
        ctx.fillText(`множитель ${mult}`, w / 2, cy + 128);
      }
    }

    // Wave intro covers the stream.
    if (this.introT > 0) {
      ctx.fillStyle = "rgba(3,4,8,0.7)";
      ctx.fillRect(0, 0, w, h);
      const a = Math.min(1, this.introT * 2);
      ctx.globalAlpha = a;
      ctx.textAlign = "center";
      ctx.font = mono(20);
      ctx.fillStyle = C.ink;
      ctx.fillText(`ВОЛНА ${this.wave + 1}`, w / 2, h * 0.42);
      ctx.font = mono(12);
      ctx.fillStyle = C.dim;
      ctx.fillText(PARRY_WAVES[this.wave].label, w / 2, h * 0.42 + 26);
      ctx.globalAlpha = 1;
    }

    if (this.errFlash > 0) {
      ctx.fillStyle = `rgba(255,40,60,${this.errFlash * 0.16})`;
      ctx.fillRect(0, 0, w, h);
    }

    drawHint(
      ctx,
      this.wave === 0
        ? "тапай, когда ЗАЗОР между словами в луче"
        : "слова — их. паузы — твои. красное не трогай",
      w / 2,
      h - 44,
      t,
    );
    ctx.textAlign = "left";
  }
}

