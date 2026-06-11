import { BaseScene } from "../core/BaseScene";
import type { Input } from "../core/Input";
import { drawBackdrop, pickBackdrop } from "../core/backdrop";
import { drawVoid } from "../core/scenery";
import { LAB_ENTRIES } from "../data/lab";
import { loadMeta, type Meta } from "../game/meta";
import { mechFactory } from "../mechanics/registry";
import { C, clamp, mono, roundRect, sans, truncate } from "../mechanics/util";
import { LabRunScene } from "./LabRunScene";
import { MenuScene } from "./MenuScene";
import { tr } from "../core/i18n";

const ROW_H = 84;
const ROW_GAP = 10;

/**
 * The mechanics gallery: ten prototypes, one tap each. Rows with a built
 * mechanic launch it standalone in the sandbox (LabRunScene); unbuilt ones
 * sit greyed out so the catalogue always shows the full plan.
 */
export class LabScene extends BaseScene {
  private scroll = 0;
  private maxScroll = 0;
  private meta!: Meta;
  /** Pointer bookkeeping to tell a scroll-drag from a tap. */
  private wasDown = false;
  private startY = 0;
  private startScroll = 0;

  protected start(): void {
    this.meta = loadMeta();
  }

  handleInput(input: Input): void {
    // Live drag scrolls; the latched gesture decides tap vs swipe on release,
    // so even single-frame synthetic clicks land.
    if (input.down && !this.wasDown) {
      this.startY = input.y;
      this.startScroll = this.scroll;
    }
    if (input.down) {
      this.scroll = clamp(this.startScroll - (input.y - this.startY), 0, this.maxScroll);
    }
    this.wasDown = input.down;
    if (input.pollGesture()?.type === "tap") {
      input.consumeTap();
      this.handleTap(input.x, input.y);
    }
  }

  private handleTap(x: number, y: number): void {
    const { width: w } = this.game;
    const top = this.headerH();
    // Back chip.
    if (y <= top && x <= w * 0.3) {
      this.game.changeScene(new MenuScene());
      return;
    }
    const idx = this.rowAt(x, y);
    if (idx < 0) return;
    const entry = LAB_ENTRIES[idx];
    if (!mechFactory(entry.id)) return;
    this.game.changeScene(new LabRunScene(entry));
  }

  private headerH(): number {
    return this.game.insets.top + 64;
  }

  private rowAt(x: number, y: number): number {
    const { width: w } = this.game;
    const rx = w / 2 - this.rowW() / 2;
    if (x < rx || x > rx + this.rowW()) return -1;
    const local = y - this.headerH() - 8 + this.scroll;
    const idx = Math.floor(local / (ROW_H + ROW_GAP));
    if (idx < 0 || idx >= LAB_ENTRIES.length) return -1;
    const within = local - idx * (ROW_H + ROW_GAP);
    return within <= ROW_H ? idx : -1;
  }

  private rowW(): number {
    return Math.min(this.game.width * 0.9, 400);
  }

  /** Small mono tag chip (v2 `.tag`); returns the advance for the next one. */
  private tagChip(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    text: string,
    color: string,
    fill: string,
  ): number {
    ctx.font = mono(10);
    const w = ctx.measureText(text).width + 18;
    roundRect(ctx, x, y, w, 19, 7);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.fillStyle = color;
    ctx.textAlign = "left";
    ctx.fillText(text, x + 9, y + 13.5);
    return w + 8;
  }

  update(_dt: number): void {
    const { height: h } = this.game;
    const listH = LAB_ENTRIES.length * (ROW_H + ROW_GAP);
    this.maxScroll = Math.max(0, listH + this.headerH() + 24 - h);
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { width: w, height: h, time } = this.game;
    const bg = pickBackdrop(this.game.assets, "lab", w, h);
    if (bg) drawBackdrop(ctx, bg, w, h, time, 0.55);
    else drawVoid(ctx, w, h);

    // Faint scanline texture, the lab as a diagnostics room.
    ctx.fillStyle = "rgba(122,162,255,0.025)";
    for (let y = (time * 12) % 6; y < h; y += 6) ctx.fillRect(0, y, w, 1);

    const top = this.headerH();
    const rw = this.rowW();
    const rx = w / 2 - rw / 2;

    // Rows (under the header so they slide beneath it).
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, top, w, h - top);
    ctx.clip();
    for (let i = 0; i < LAB_ENTRIES.length; i++) {
      const e = LAB_ENTRIES[i];
      const ry = top + 8 + i * (ROW_H + ROW_GAP) - this.scroll;
      if (ry > h || ry + ROW_H < top) continue;
      const ready = Boolean(mechFactory(e.id));
      const cleared = this.meta.labBest.includes(e.id);

      ctx.fillStyle = ready ? "rgba(16,20,34,0.88)" : "rgba(12,14,22,0.6)";
      ctx.strokeStyle = ready ? "rgba(125,162,255,0.4)" : "rgba(110,120,140,0.18)";
      ctx.lineWidth = 1.5;
      roundRect(ctx, rx, ry, rw, ROW_H, 12);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = "left";
      ctx.font = mono(11);
      ctx.fillStyle = ready ? C.accent : C.dim;
      ctx.fillText(String(i + 1).padStart(2, "0"), rx + 14, ry + 24);

      ctx.font = mono(14);
      ctx.fillStyle = ready ? C.ink : C.dim;
      ctx.fillText(e.name, rx + 44, ry + 24);

      ctx.font = sans(11);
      ctx.fillStyle = C.dim;
      ctx.fillText(truncate(ctx, e.desc, rw - 58), rx + 44, ry + 44);

      // Tag chips: ascent stage, and the gold "cleared" badge once won.
      let chipX = rx + 44;
      chipX += this.tagChip(ctx, chipX, ry + 56, e.stage, C.accentSoft, "rgba(125,162,255,0.12)");
      if (cleared) {
        this.tagChip(ctx, chipX, ry + 56, tr("лучший: пройдено", "best: cleared"), C.gold, "rgba(255,210,122,0.12)");
      }

      ctx.textAlign = "right";
      ctx.font = mono(10);
      if (ready) {
        ctx.fillStyle = C.good;
        ctx.fillText(e.ref, rx + rw - 14, ry + 24);
      } else {
        ctx.fillStyle = "rgba(110,120,140,0.5)";
        ctx.fillText(tr("В РАЗРАБОТКЕ", "IN DEV"), rx + rw - 14, ry + 24);
      }
    }
    ctx.restore();

    // Header on top.
    const hg = ctx.createLinearGradient(0, 0, 0, top + 14);
    hg.addColorStop(0, "rgba(4,5,10,0.97)");
    hg.addColorStop(0.8, "rgba(4,5,10,0.9)");
    hg.addColorStop(1, "rgba(4,5,10,0)");
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, w, top + 14);

    const hy = this.game.insets.top + 36;
    ctx.textAlign = "left";
    ctx.font = mono(12);
    ctx.fillStyle = C.accentSoft;
    ctx.fillText(tr("← МЕНЮ", "← MENU"), rx, hy);
    ctx.textAlign = "center";
    ctx.font = mono(15);
    ctx.fillStyle = C.ink;
    ctx.fillText(tr("МЕХАНИК-ЛАБ", "MECHANICS LAB"), w / 2, hy);
    ctx.textAlign = "right";
    ctx.font = mono(10);
    ctx.fillStyle = C.dim;
    const readyCount = LAB_ENTRIES.filter((e) => mechFactory(e.id)).length;
    ctx.fillText(`${readyCount}/${LAB_ENTRIES.length}`, rx + rw, hy);
    ctx.textAlign = "left";
  }
}
