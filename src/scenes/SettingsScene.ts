import { audio } from "../core/audio";
import { BaseScene } from "../core/BaseScene";
import { tr } from "../core/i18n";
import type { Input } from "../core/Input";
import { Starfield } from "../core/Starfield";
import { drawVoid } from "../core/scenery";
import { button, chip, label, panel } from "../core/theme";
import {
  ACCENTS,
  DENSITIES,
  TEMPOS,
  resetSettings,
  settings,
  updateSettings,
} from "../game/settings";
import { C, SURF, sans } from "../mechanics/util";
import { MenuScene } from "./MenuScene";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** One row of the settings list, with its control's hit zones. */
interface Row {
  readonly title: string;
  readonly kind: "swatches" | "stepper" | "segments" | "toggle";
  readonly height: number;
}

/**
 * The settings screen — the prototype's Tweaks panel shipped to players.
 * Everything previews live: the palette retints, text rescales and density
 * reflows the canvas the moment a control is touched.
 */
export class SettingsScene extends BaseScene {
  private starfield!: Starfield;
  private scroll = 0;
  private maxScroll = 0;
  private wasDown = false;
  private startY = 0;
  private startScroll = 0;

  private rows: Row[] = [
    { title: tr("АКЦЕНТ", "ACCENT"), kind: "swatches", height: 96 },
    { title: tr("МАСШТАБ ТЕКСТА", "TEXT SCALE"), kind: "stepper", height: 86 },
    { title: tr("ПЛОТНОСТЬ UI", "UI DENSITY"), kind: "segments", height: 96 },
    { title: tr("МИНИ-ШКАЛЫ В HUD", "HUD MINI-METERS"), kind: "toggle", height: 64 },
    { title: tr("ТЕМП / СЛОЖНОСТЬ", "TEMPO / DIFFICULTY"), kind: "segments", height: 96 },
    { title: tr("РОСТ ПОДОЗРЕНИЯ", "SUSPICION GAIN"), kind: "stepper", height: 86 },
  ];

  protected start(): void {
    audio.setMood("calm");
    this.starfield = new Starfield(this.game.width, this.game.height, 50);
  }

  // --- geometry --------------------------------------------------------------

  private colW(): number {
    return Math.min(this.game.width * 0.88, 380);
  }

  private headerH(): number {
    return this.game.insets.top + 64;
  }

  private rowRect(i: number): Rect {
    const x = this.game.width / 2 - this.colW() / 2;
    let y = this.headerH() + 10 - this.scroll;
    for (let k = 0; k < i; k++) y += this.rows[k].height + 12;
    return { x, y, w: this.colW(), h: this.rows[i].height };
  }

  private footRects(): { reset: Rect; back: Rect } {
    const last = this.rowRect(this.rows.length - 1);
    const y = last.y + last.h + 20;
    const w = this.colW();
    const x = this.game.width / 2 - w / 2;
    return {
      reset: { x, y, w: (w - 12) / 2, h: 50 },
      back: { x: x + (w + 12) / 2, y, w: (w - 12) / 2, h: 50 },
    };
  }

  /** Control hit zones inside a row, in the same coords render uses. */
  private swatchRects(r: Rect): Rect[] {
    const size = 44;
    const gap = (r.w - 36 - size * ACCENTS.length) / (ACCENTS.length - 1);
    return ACCENTS.map((_, i) => ({
      x: r.x + 18 + i * (size + gap),
      y: r.y + 38,
      w: size,
      h: size,
    }));
  }

  private stepperRects(r: Rect): { minus: Rect; plus: Rect } {
    return {
      minus: { x: r.x + 18, y: r.y + 34, w: 44, h: 38 },
      plus: { x: r.x + r.w - 62, y: r.y + 34, w: 44, h: 38 },
    };
  }

  private segmentRects(r: Rect, n: number): Rect[] {
    const w = (r.w - 36 - (n - 1) * 8) / n;
    return Array.from({ length: n }, (_, i) => ({
      x: r.x + 18 + i * (w + 8),
      y: r.y + 38,
      w,
      h: 40,
    }));
  }

  // --- input -------------------------------------------------------------------

  handleInput(input: Input): void {
    // Live drag scrolls; the latched gesture decides tap vs swipe on release,
    // so even single-frame synthetic clicks land.
    if (input.down && !this.wasDown) {
      this.startY = input.y;
      this.startScroll = this.scroll;
    }
    if (input.down) {
      this.scroll = Math.max(0, Math.min(this.maxScroll, this.startScroll - (input.y - this.startY)));
    }
    this.wasDown = input.down;
    if (input.pollGesture()?.type === "tap") {
      input.consumeTap();
      this.tap(input.x, input.y);
    }
  }

  private tap(x: number, y: number): void {
    // Back chip in the header.
    if (y <= this.headerH() && x <= this.game.width * 0.3) {
      audio.play("tap");
      this.game.changeScene(new MenuScene());
      return;
    }

    const hit = (r: Rect): boolean => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

    const { reset, back } = this.footRects();
    if (hit(reset)) {
      audio.play("good");
      resetSettings();
      return;
    }
    if (hit(back)) {
      audio.play("tap");
      this.game.changeScene(new MenuScene());
      return;
    }

    for (let i = 0; i < this.rows.length; i++) {
      const r = this.rowRect(i);
      if (!hit(r)) continue;
      switch (i) {
        case 0: {
          const sw = this.swatchRects(r);
          for (let k = 0; k < sw.length; k++) {
            if (hit(sw[k])) {
              audio.play("tap");
              updateSettings({ accent: ACCENTS[k] });
            }
          }
          return;
        }
        case 1: {
          const { minus, plus } = this.stepperRects(r);
          if (hit(minus)) this.bump("fontScale", -0.05, 0.85, 1.35);
          if (hit(plus)) this.bump("fontScale", 0.05, 0.85, 1.35);
          return;
        }
        case 2: {
          const seg = this.segmentRects(r, DENSITIES.length);
          for (let k = 0; k < seg.length; k++) {
            if (hit(seg[k])) {
              audio.play("tap");
              updateSettings({ density: DENSITIES[k] });
            }
          }
          return;
        }
        case 3: {
          audio.play("tap");
          updateSettings({ showMeters: !settings.showMeters });
          return;
        }
        case 4: {
          const seg = this.segmentRects(r, TEMPOS.length);
          for (let k = 0; k < seg.length; k++) {
            if (hit(seg[k])) {
              audio.play("tap");
              updateSettings({ tempo: TEMPOS[k] });
            }
          }
          return;
        }
        case 5: {
          const { minus, plus } = this.stepperRects(r);
          if (hit(minus)) this.bump("suspGain", -0.1, 0.5, 1.5);
          if (hit(plus)) this.bump("suspGain", 0.1, 0.5, 1.5);
          return;
        }
      }
    }
  }

  private bump(key: "fontScale" | "suspGain", d: number, lo: number, hi: number): void {
    const next = Math.round((settings[key] + d) * 100) / 100;
    if (next < lo - 1e-9 || next > hi + 1e-9) {
      audio.play("lose");
      return;
    }
    audio.play("tap");
    updateSettings({ [key]: next } as Partial<typeof settings>);
  }

  update(dt: number): void {
    this.starfield.resize(this.game.width, this.game.height);
    this.starfield.update(dt);
    const { back } = this.footRects();
    const bottom = back.y + back.h + this.scroll + 24 + Math.max(16, this.game.insets.bottom);
    this.maxScroll = Math.max(0, bottom - this.game.height);
  }

  // --- render ------------------------------------------------------------------

  render(ctx: CanvasRenderingContext2D): void {
    const { width: w, height: h } = this.game;
    drawVoid(ctx, w, h);
    this.starfield.render(ctx);

    for (let i = 0; i < this.rows.length; i++) this.renderRow(ctx, i);

    const { reset, back } = this.footRects();
    button(ctx, reset.x, reset.y, reset.w, reset.h, tr("СБРОС", "RESET"), "ghost");
    button(ctx, back.x, back.y, back.w, back.h, tr("НАЗАД", "BACK"), "primary");

    // Header above the scrolling list.
    const top = this.headerH();
    const hg = ctx.createLinearGradient(0, 0, 0, top + 14);
    hg.addColorStop(0, "rgba(4,6,12,0.97)");
    hg.addColorStop(0.8, "rgba(4,6,12,0.9)");
    hg.addColorStop(1, "rgba(4,6,12,0)");
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, w, top + 14);
    const hy = this.game.insets.top + 36;
    const mx = w / 2 - this.colW() / 2;
    label(ctx, tr("← МЕНЮ", "← MENU"), mx, hy, { color: C.accentSoft, align: "left", size: 12, track: "0.06em", weight: 600 });
    label(ctx, tr("НАСТРОЙКИ", "SETTINGS"), w / 2, hy, { color: C.ink, align: "center", size: 15, weight: 700, track: "0.12em" });
  }

  private renderRow(ctx: CanvasRenderingContext2D, i: number): void {
    const r = this.rowRect(i);
    if (r.y > this.game.height || r.y + r.h < this.headerH() - 20) return;
    panel(ctx, r.x, r.y, r.w, r.h);
    label(ctx, this.rows[i].title, r.x + 18, r.y + 24, { color: C.dim, align: "left", size: 11 });

    switch (i) {
      case 0: {
        // Accent swatches with a check on the active one.
        const sw = this.swatchRects(r);
        for (let k = 0; k < sw.length; k++) {
          const s = sw[k];
          const on = settings.accent === ACCENTS[k];
          ctx.beginPath();
          ctx.roundRect(s.x, s.y, s.w, s.h, 10);
          ctx.fillStyle = ACCENTS[k];
          ctx.fill();
          if (on) {
            ctx.lineWidth = 3;
            ctx.strokeStyle = C.ink;
            ctx.stroke();
            label(ctx, "✓", s.x + s.w / 2, s.y + s.h / 2 + 5, { color: "#0a0f1c", align: "center", size: 16, weight: 700, track: "0" });
          } else {
            ctx.lineWidth = 1;
            ctx.strokeStyle = "rgba(255,255,255,0.25)";
            ctx.stroke();
          }
        }
        return;
      }
      case 1:
      case 5: {
        const { minus, plus } = this.stepperRects(r);
        const value = i === 1 ? settings.fontScale : settings.suspGain;
        const text = i === 1 ? `×${value.toFixed(2)}` : `×${value.toFixed(1)}`;
        button(ctx, minus.x, minus.y, minus.w, minus.h, "−", "ghost", { size: 18 });
        button(ctx, plus.x, plus.y, plus.w, plus.h, "+", "ghost", { size: 18 });
        ctx.textAlign = "center";
        ctx.font = `700 20px 'JetBrains Mono', ui-monospace, monospace`;
        ctx.fillStyle = C.accentSoft;
        ctx.fillText(text, r.x + r.w / 2, minus.y + 27);
        return;
      }
      case 2:
      case 4: {
        const names =
          i === 2
            ? [tr("ПЛОТНО", "TIGHT"), tr("НОРМА", "NORMAL"), tr("ПРОСТОРНО", "ROOMY")]
            : [tr("СПОКОЙНО", "CALM"), tr("НОРМА", "NORMAL"), tr("ЖЁСТЧЕ", "HARDER")];
        const values: readonly number[] = i === 2 ? DENSITIES : TEMPOS;
        const cur = i === 2 ? settings.density : settings.tempo;
        const seg = this.segmentRects(r, values.length);
        for (let k = 0; k < seg.length; k++) {
          const s = seg[k];
          const on = Math.abs(cur - values[k]) < 1e-9;
          ctx.beginPath();
          ctx.roundRect(s.x, s.y, s.w, s.h, 10);
          ctx.fillStyle = on ? "rgba(60,92,170,0.5)" : SURF.chip;
          ctx.fill();
          ctx.lineWidth = on ? 1.5 : 1;
          ctx.strokeStyle = on ? C.accent : SURF.stroke;
          ctx.stroke();
          ctx.textBaseline = "middle";
          label(ctx, names[k], s.x + s.w / 2, s.y + s.h / 2, {
            color: on ? C.ink : C.dim,
            align: "center",
            size: 11,
            track: "0.06em",
            weight: on ? 700 : 500,
          });
          ctx.textBaseline = "alphabetic";
        }
        return;
      }
      case 3: {
        const on = settings.showMeters;
        const tx = r.x + r.w - 86;
        chip(ctx, tx, r.y + 16, 68, 32, {
          stroke: on ? C.good : SURF.stroke,
          fill: on ? "rgba(70,222,150,0.12)" : undefined,
        });
        ctx.textBaseline = "middle";
        label(ctx, on ? tr("ВКЛ", "ON") : tr("ВЫКЛ", "OFF"), tx + 34, r.y + 32, {
          color: on ? C.good : C.faint,
          align: "center",
          size: 12,
          weight: 700,
          track: "0.06em",
        });
        ctx.textBaseline = "alphabetic";
        // Inline caption under the title.
        ctx.font = sans(12, "500");
        ctx.fillStyle = C.faint;
        ctx.textAlign = "left";
        ctx.fillText(
          tr("скорость · контроль · понимание", "speed · control · comprehension"),
          r.x + 18,
          r.y + 46,
        );
        return;
      }
    }
  }
}
