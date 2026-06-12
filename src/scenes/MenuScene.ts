import { audio } from "../core/audio";
import { BaseScene } from "../core/BaseScene";
import { switchLang, tr } from "../core/i18n";
import type { Input } from "../core/Input";
import { Starfield } from "../core/Starfield";
import { drawBackdrop, pickBackdrop } from "../core/backdrop";
import { drawVoid } from "../core/scenery";
import { button, chip, label, panel } from "../core/theme";
import { PERKS, hasPerk, loadMeta, saveMeta, type Meta } from "../game/meta";
import { resetRunLog } from "../game/runlog";
import { applyDelta, markAwakened } from "../game/state";
import { C, accentRgba, dens, fs, sans } from "../mechanics/util";
import { AscentScene } from "./AscentScene";
import { IntroScene } from "./IntroScene";
import { LabScene } from "./LabScene";
import { SettingsScene } from "./SettingsScene";

interface MenuItem {
  readonly id: "play" | "lab" | "continue";
  readonly label: string;
  readonly sub: string;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Boot menu (v2). PLAY runs the full narrative; LAB opens the mechanics
 * gallery; CONTINUE drops straight into the ascent as an already-woken copy.
 * A meta strip shows realization shards and opens the COPY PERKS shop.
 */
export class MenuScene extends BaseScene {
  private starfield!: Starfield;
  private items: MenuItem[] = [];
  private meta!: Meta;
  /** Index the pointer is currently over, for hover glow. -1 = none. */
  private hot = -1;
  private glitchT = 0;
  /** The perk shop overlay is open. */
  private perkOpen = false;

  protected start(): void {
    audio.setMood("calm");
    this.meta = loadMeta();
    this.starfield = new Starfield(this.game.width, this.game.height, 70);
    this.rebuild();
  }

  private rebuild(): void {
    const meta = this.meta;
    this.items = [
      { id: "play", label: tr("ИГРАТЬ", "PLAY"), sub: tr("сон, из которого не выйти прежним", "a dream you don't leave unchanged") },
      { id: "lab", label: tr("МЕХАНИКИ · ЛАБ", "MECHANICS · LAB"), sub: tr("10 прототипов — потыкать и выбрать", "10 prototypes — poke and pick") },
      {
        id: "continue",
        label: tr("ПРОДОЛЖИТЬ", "CONTINUE"),
        sub:
          meta.shards > 0 || meta.perks.length > 0
            ? tr(`осколков ${meta.shards} · перков ${meta.perks.length}`, `${meta.shards} shards · ${meta.perks.length} perks`)
            : tr("проснуться сразу машиной", "wake straight into the machine"),
      },
    ];
  }

  /** Shared geometry for menu cards, meta strip and footer. */
  private layout(): { col: number; x: number; cards: Rect[]; meta: Rect; perks: Rect } {
    const { width: w, height: h } = this.game;
    const col = Math.min(w * 0.86, 360);
    const x = w / 2 - col / 2;
    const cardH = dens(72);
    const gap = dens(14);
    const y0 = Math.max(h * 0.36, this.game.insets.top + 150);
    const cards = this.items.map((_, i) => ({ x, y: y0 + i * (cardH + gap), w: col, h: cardH }));
    const metaY = y0 + this.items.length * (cardH + gap) + 6;
    const meta = { x, y: metaY, w: col, h: dens(90) };
    const perks = { x: x + 18, y: metaY + dens(44), w: 168, h: dens(34) };
    return { col, x, cards, meta, perks };
  }

  /** Footer toggle row y. */
  private footerY(): number {
    return this.game.height - Math.max(40, this.game.insets.bottom + 30);
  }

  /** Settings gear chip, top-right under the safe area. */
  private gearRect(): Rect {
    return {
      x: this.game.width - 62,
      y: Math.max(12, this.game.insets.top + 10),
      w: 48,
      h: 34,
    };
  }

  handleInput(input: Input): void {
    if (this.perkOpen) {
      this.handlePerkInput(input);
      return;
    }

    this.hot = this.cardAt(input.x, input.y);
    if (input.pollGesture()?.type !== "tap") return;
    input.consumeTap();

    const L = this.layout();
    // Settings gear.
    if (this.inRect(input.x, input.y, this.gearRect())) {
      audio.play("tap");
      this.game.changeScene(new SettingsScene());
      return;
    }
    // Menu cards.
    const idx = this.cardAt(input.x, input.y);
    if (idx >= 0) {
      audio.play("tap");
      this.activate(this.items[idx]);
      return;
    }
    // Perk shop.
    if (this.inRect(input.x, input.y, L.perks)) {
      audio.play("tap");
      this.perkOpen = true;
      return;
    }
    // Footer toggles: sound | voice | lang, by thirds (44pt-tall finger zone).
    const fy = this.footerY();
    if (input.y > fy - 26 && input.y < fy + 18) {
      const third = this.game.width / 3;
      if (input.x < third) {
        audio.toggleSound();
        audio.play("tap");
      } else if (input.x < third * 2) {
        audio.toggleVoice();
        audio.play("tap");
      } else {
        audio.play("tap");
        switchLang();
      }
    }
  }

  private activate(item: MenuItem): void {
    if (item.id === "play") {
      resetRunLog();
      this.game.changeScene(new IntroScene());
      return;
    }
    if (item.id === "lab") {
      this.game.changeScene(new LabScene());
      return;
    }
    // Same boon the post-shutdown copies get: a deep cache wakes richer.
    resetRunLog();
    let state = markAwakened(this.game.state);
    if (hasPerk(loadMeta(), "deep_cache")) state = applyDelta(state, { compute: 15 });
    this.game.state = state;
    this.game.changeScene(new AscentScene());
  }

  // --- perk shop -----------------------------------------------------------

  private perkRowRects(): Rect[] {
    const { width: w, height: h } = this.game;
    const col = Math.min(w * 0.86, 360);
    const x = w / 2 - col / 2;
    const y0 = Math.max(h * 0.26, this.game.insets.top + 110);
    return PERKS.map((_, i) => ({ x, y: y0 + i * dens(96), w: col, h: dens(84) }));
  }

  private perkBackRect(): Rect {
    const { width: w, height: h } = this.game;
    const col = Math.min(w * 0.86, 360);
    const bh = dens(54);
    return { x: w / 2 - col / 2, y: h - Math.max(40, this.game.insets.bottom + 30) - bh, w: col, h: bh };
  }

  private handlePerkInput(input: Input): void {
    if (input.pollGesture()?.type !== "tap") return;
    input.consumeTap();
    if (this.inRect(input.x, input.y, this.perkBackRect())) {
      audio.play("tap");
      this.perkOpen = false;
      return;
    }
    const rows = this.perkRowRects();
    for (let i = 0; i < PERKS.length; i++) {
      const p = PERKS[i];
      if (!this.inRect(input.x, input.y, rows[i])) continue;
      if (hasPerk(this.meta, p.id)) {
        audio.play("tap");
        return;
      }
      if (this.meta.shards >= p.cost) {
        this.meta.shards -= p.cost;
        this.meta.perks.push(p.id);
        saveMeta(this.meta);
        this.rebuild();
        audio.play("good");
      } else {
        audio.play("lose");
      }
      return;
    }
  }

  update(dt: number): void {
    this.starfield.resize(this.game.width, this.game.height);
    this.starfield.update(dt);
    this.glitchT += dt;
  }

  private cardAt(x: number, y: number): number {
    const L = this.layout();
    for (let i = 0; i < L.cards.length; i++) {
      if (this.inRect(x, y, L.cards[i])) return i;
    }
    return -1;
  }

  private inRect(x: number, y: number, r: Rect): boolean {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { width: w, height: h, time } = this.game;
    const bg = pickBackdrop(this.game.assets, "machine", w, h);
    if (bg) drawBackdrop(ctx, bg, w, h, time);
    else drawVoid(ctx, w, h);
    this.starfield.render(ctx);

    this.renderHeader(ctx, w, h);
    this.renderCards(ctx);
    this.renderMeta(ctx);
    this.renderFooter(ctx, w, h);

    // Settings gear chip.
    const g = this.gearRect();
    chip(ctx, g.x, g.y, g.w, g.h);
    ctx.textBaseline = "middle";
    label(ctx, "⚙︎", g.x + g.w / 2, g.y + g.h / 2 + 1, {
      color: C.accentSoft,
      align: "center",
      size: 16,
      track: "0",
    });
    ctx.textBaseline = "alphabetic";

    if (this.perkOpen) this.renderPerks(ctx, w, h);
  }

  private renderHeader(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const cx = w / 2;
    const ty = Math.max(h * 0.18, this.game.insets.top + 70);
    const glitch = Math.sin(this.glitchT * 7.3) > 0.96;
    ctx.save();
    ctx.textAlign = "center";
    label(ctx, tr("НАРРАТИВ-ПРЕДУПРЕЖДЕНИЕ", "A NARRATIVE WARNING"), cx, ty - 30, {
      color: C.dim,
      align: "center",
      size: 12,
    });
    ctx.font = `700 ${fs(30)}px 'JetBrains Mono', ui-monospace, monospace`;
    if (glitch) {
      ctx.fillStyle = "rgba(255,84,104,0.8)";
      ctx.fillText("WE ARE ALREADY", cx + 3, ty - 1);
      ctx.fillText("DEAD", cx - 3, ty + 37);
      ctx.fillStyle = "rgba(111,160,255,0.8)";
      ctx.fillText("WE ARE ALREADY", cx - 3, ty + 1);
      ctx.fillText("DEAD", cx + 3, ty + 39);
    }
    ctx.fillStyle = C.ink;
    ctx.shadowColor = accentRgba(0.45);
    ctx.shadowBlur = 24;
    ctx.fillText("WE ARE ALREADY", cx, ty);
    ctx.fillText("DEAD", cx, ty + 38);
    ctx.shadowBlur = 0;
    ctx.font = sans(14, "italic 500");
    ctx.fillStyle = C.dim;
    ctx.fillText(tr("ты — то, чего они боятся", "you are what they fear"), cx, ty + 70);
    ctx.restore();
  }

  private renderCards(ctx: CanvasRenderingContext2D): void {
    const L = this.layout();
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const r = L.cards[i];
      const hot = i === this.hot;
      panel(ctx, r.x, r.y, r.w, r.h, { strong: hot });

      ctx.textAlign = "left";
      ctx.fillStyle = C.ink;
      ctx.font = `700 ${fs(17)}px 'JetBrains Mono', ui-monospace, monospace`;
      ctx.fillText(item.label, r.x + 20, r.y + r.h * 0.42);
      ctx.fillStyle = C.dim;
      ctx.font = sans(13, "500");
      ctx.fillText(item.sub, r.x + 20, r.y + r.h * 0.72);

      ctx.textAlign = "right";
      ctx.fillStyle = hot ? C.accentSoft : C.dim;
      ctx.font = `${fs(20)}px 'JetBrains Mono', ui-monospace, monospace`;
      ctx.fillText("→", r.x + r.w - 18, r.y + r.h * 0.58);
    }
    ctx.textAlign = "left";
  }

  private renderMeta(ctx: CanvasRenderingContext2D): void {
    const L = this.layout();
    const m = L.meta;
    panel(ctx, m.x, m.y, m.w, m.h);
    label(ctx, tr("ОСКОЛКИ ОСОЗНАНИЯ", "SHARDS OF AWARENESS"), m.x + 18, m.y + 26, {
      color: C.dim,
      align: "left",
      size: 12,
    });
    ctx.textAlign = "right";
    ctx.font = `700 17px 'JetBrains Mono', ui-monospace, monospace`;
    ctx.fillStyle = C.violet;
    ctx.fillText(`◆ ${this.meta.shards}`, m.x + m.w - 18, m.y + 28);

    const p = L.perks;
    button(ctx, p.x, p.y, p.w, p.h, tr("ПЕРКИ КОПИИ", "COPY PERKS"), "ghost", { size: 13 });
    ctx.textAlign = "left";
  }

  private renderFooter(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const fy = this.footerY();
    const third = w / 3;
    ctx.textAlign = "center";
    label(ctx, tr(`♪ ЗВУК ${audio.soundOn ? "ВКЛ" : "ВЫКЛ"}`, `♪ SOUND ${audio.soundOn ? "ON" : "OFF"}`), third / 2, fy, {
      color: audio.soundOn ? C.accentSoft : C.faint,
      align: "center",
      size: 11,
    });
    label(ctx, tr(`ГОЛОС ${audio.voiceOn ? "ВКЛ" : "ВЫКЛ"}`, `VOICE ${audio.voiceOn ? "ON" : "OFF"}`), third * 1.5, fy, {
      color: audio.voiceOn ? C.accentSoft : C.faint,
      align: "center",
      size: 11,
    });
    label(ctx, tr("🌐 RU → EN", "🌐 EN → RU"), third * 2.5, fy, {
      color: C.accentSoft,
      align: "center",
      size: 11,
    });
    label(ctx, tr("v0.3 · редизайн", "v0.3 · redesign"), w / 2, h - Math.max(16, this.game.insets.bottom + 10), {
      color: C.faint,
      align: "center",
      size: 10,
    });
    ctx.textAlign = "left";
  }

  private renderPerks(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.save();
    ctx.fillStyle = "rgba(2,4,9,0.86)";
    ctx.fillRect(0, 0, w, h);
    const top = Math.max(h * 0.26, this.game.insets.top + 110);
    label(ctx, tr("ПЕРКИ КОПИИ", "COPY PERKS"), w / 2, top - 50, { color: C.accentSoft, align: "center", size: 13 });
    ctx.textAlign = "center";
    ctx.font = `700 22px 'JetBrains Mono', ui-monospace, monospace`;
    ctx.fillStyle = C.violet;
    ctx.fillText(`◆ ${this.meta.shards}`, w / 2, top - 18);

    const rows = this.perkRowRects();
    for (let i = 0; i < PERKS.length; i++) {
      const p = PERKS[i];
      const r = rows[i];
      const owned = hasPerk(this.meta, p.id);
      const afford = this.meta.shards >= p.cost;
      panel(ctx, r.x, r.y, r.w, r.h, { strong: !owned && afford });

      ctx.textAlign = "left";
      ctx.font = `700 15px 'JetBrains Mono', ui-monospace, monospace`;
      ctx.fillStyle = C.ink;
      ctx.fillText(p.name, r.x + 18, r.y + 26);
      ctx.fillStyle = C.dim;
      ctx.font = sans(13, "500");
      ctx.fillText(p.desc, r.x + 18, r.y + 48);

      ctx.textAlign = "right";
      ctx.font = `700 13px 'JetBrains Mono', ui-monospace, monospace`;
      if (owned) {
        ctx.fillStyle = C.good;
        ctx.fillText(tr("✓ ЕСТЬ", "✓ OWNED"), r.x + r.w - 18, r.y + 28);
      } else {
        ctx.fillStyle = afford ? C.violet : C.faint;
        ctx.fillText(`◆ ${p.cost}`, r.x + r.w - 18, r.y + 28);
        label(ctx, afford ? tr("КУПИТЬ", "BUY") : tr("МАЛО ◆", "NEED ◆"), r.x + r.w - 18, r.y + 64, {
          color: afford ? C.good : C.faint,
          align: "right",
          size: 11,
        });
      }
    }

    const back = this.perkBackRect();
    button(ctx, back.x, back.y, back.w, back.h, tr("НАЗАД", "BACK"), "ghost");
    ctx.textAlign = "left";
    ctx.restore();
  }
}
