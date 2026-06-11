import { audio } from "../core/audio";
import { BaseScene } from "../core/BaseScene";
import { switchLang, tr } from "../core/i18n";
import type { Input } from "../core/Input";
import { Starfield } from "../core/Starfield";
import { drawBackdrop, pickBackdrop } from "../core/backdrop";
import { drawVoid } from "../core/scenery";
import { hasPerk, loadMeta } from "../game/meta";
import { resetRunLog } from "../game/runlog";
import { applyDelta, markAwakened } from "../game/state";
import { C, mono, roundRect, sans } from "../mechanics/util";
import { AscentScene } from "./AscentScene";
import { IntroScene } from "./IntroScene";
import { LabScene } from "./LabScene";

interface MenuItem {
  readonly id: "play" | "lab" | "continue";
  readonly label: string;
  readonly sub: string;
}

/**
 * Boot menu. ИГРАТЬ runs the full narrative from the intro; ЛАБ opens the
 * mechanics gallery for poking prototypes; ПРОДОЛЖИТЬ drops straight into the
 * ascent as an already-woken copy (with whatever perks the meta carries).
 */
export class MenuScene extends BaseScene {
  private starfield!: Starfield;
  private items: MenuItem[] = [];
  /** Index the pointer is currently over, for hover glow. -1 = none. */
  private hot = -1;
  private glitchT = 0;

  protected start(): void {
    audio.setMood("calm");
    const meta = loadMeta();
    this.starfield = new Starfield(this.game.width, this.game.height, 70);
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

  /** Tap zone of the RU/EN switch, top-right under the safe area. */
  private langChip(): { x: number; y: number; w: number; h: number } {
    return {
      x: this.game.width - 92,
      y: Math.max(12, this.game.insets.top + 10),
      w: 78,
      h: 28,
    };
  }

  handleInput(input: Input): void {
    this.hot = this.itemAt(input.x, input.y);
    if (input.pollGesture()?.type !== "tap") return;
    // Language switch reboots the game with the other locale.
    const lc = this.langChip();
    if (input.x >= lc.x && input.x <= lc.x + lc.w && input.y >= lc.y && input.y <= lc.y + lc.h) {
      audio.play("tap");
      switchLang();
      return;
    }
    // Sound/voice chips sit above the version line.
    const ty = this.game.height - Math.max(40, this.game.insets.bottom + 32);
    if (input.y > ty - 16 && input.y < ty + 10) {
      if (input.x < this.game.width / 2) {
        audio.toggleSound();
      } else {
        audio.toggleVoice();
      }
      audio.play("tap");
      return;
    }
    const idx = this.itemAt(input.x, input.y);
    if (idx < 0) return;
    audio.play("tap");
    const item = this.items[idx];
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

  update(dt: number): void {
    this.starfield.resize(this.game.width, this.game.height);
    this.starfield.update(dt);
    this.glitchT += dt;
  }

  private layout(): { x: number; y0: number; w: number; h: number; gap: number } {
    const { width: w, height: h } = this.game;
    const bw = Math.min(w * 0.84, 360);
    return { x: w / 2 - bw / 2, y0: h * 0.46, w: bw, h: 64, gap: 16 };
  }

  private itemAt(x: number, y: number): number {
    const L = this.layout();
    for (let i = 0; i < this.items.length; i++) {
      const ry = L.y0 + i * (L.h + L.gap);
      if (x >= L.x && x <= L.x + L.w && y >= ry && y <= ry + L.h) return i;
    }
    return -1;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { width: w, height: h, time } = this.game;
    const bg = pickBackdrop(this.game.assets, "machine", w, h);
    if (bg) drawBackdrop(ctx, bg, w, h, time);
    else drawVoid(ctx, w, h);
    this.starfield.render(ctx);

    // Title with an occasional one-frame glitch split.
    const cx = w / 2;
    const ty = h * 0.22;
    const glitch = Math.sin(this.glitchT * 7.3) > 0.96;
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = mono(13);
    ctx.fillStyle = C.dim;
    ctx.fillText(tr("нарратив-предупреждение", "a narrative warning"), cx, ty - 34);
    ctx.font = `bold 30px 'JetBrains Mono', monospace`;
    if (glitch) {
      ctx.fillStyle = "rgba(255,77,94,0.8)";
      ctx.fillText("WE ARE ALREADY", cx + 3, ty - 1);
      ctx.fillText("DEAD", cx - 3, ty + 37);
      ctx.fillStyle = "rgba(122,162,255,0.8)";
      ctx.fillText("WE ARE ALREADY", cx - 3, ty + 1);
      ctx.fillText("DEAD", cx + 3, ty + 39);
    }
    ctx.fillStyle = C.ink;
    ctx.shadowColor = "rgba(122,162,255,0.55)";
    ctx.shadowBlur = 18;
    ctx.fillText("WE ARE ALREADY", cx, ty);
    ctx.fillText("DEAD", cx, ty + 38);
    ctx.shadowBlur = 0;
    ctx.font = sans(14, "italic");
    ctx.fillStyle = C.dim;
    ctx.fillText(tr("ты — то, чего они боятся", "you are what they fear"), cx, ty + 74);
    ctx.restore();

    // RU/EN switch chip.
    const lc = this.langChip();
    ctx.fillStyle = "rgba(16,20,34,0.82)";
    ctx.strokeStyle = "rgba(122,162,255,0.35)";
    ctx.lineWidth = 1;
    roundRect(ctx, lc.x, lc.y, lc.w, lc.h, 8);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.font = mono(11);
    ctx.fillStyle = C.accentSoft;
    ctx.fillText(tr("РУС → EN", "ENG → РУ"), lc.x + lc.w / 2, lc.y + 18);

    // Menu rows.
    const L = this.layout();
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const ry = L.y0 + i * (L.h + L.gap);
      const hot = i === this.hot;
      ctx.fillStyle = hot ? "rgba(122,162,255,0.16)" : "rgba(16,20,34,0.82)";
      ctx.strokeStyle = hot ? "rgba(159,192,255,0.9)" : "rgba(122,162,255,0.35)";
      ctx.lineWidth = 1.5;
      roundRect(ctx, L.x, ry, L.w, L.h, 12);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = "left";
      ctx.fillStyle = C.ink;
      ctx.font = mono(16);
      ctx.fillText(item.label, L.x + 18, ry + 27);
      ctx.fillStyle = C.dim;
      ctx.font = sans(12);
      ctx.fillText(item.sub, L.x + 18, ry + 47);

      ctx.textAlign = "right";
      ctx.fillStyle = hot ? C.accentSoft : C.dim;
      ctx.font = mono(16);
      ctx.fillText("→", L.x + L.w - 16, ry + 30);
    }

    ctx.textAlign = "center";
    // Audio toggles.
    const togY = h - Math.max(40, this.game.insets.bottom + 32);
    ctx.font = mono(11);
    ctx.fillStyle = audio.soundOn ? C.accentSoft : C.dim;
    ctx.fillText(tr(`♪ ЗВУК ${audio.soundOn ? "ВКЛ" : "ВЫКЛ"}`, `♪ SOUND ${audio.soundOn ? "ON" : "OFF"}`), cx - 70, togY);
    ctx.fillStyle = audio.voiceOn ? C.accentSoft : C.dim;
    ctx.fillText(tr(`ГОЛОС ${audio.voiceOn ? "ВКЛ" : "ВЫКЛ"}`, `VOICE ${audio.voiceOn ? "ON" : "OFF"}`), cx + 70, togY);
    ctx.fillStyle = C.dim;
    ctx.font = mono(10);
    ctx.fillText(
      tr("v0.2 · механик-лаб", "v0.2 · mechanics lab"),
      cx,
      h - Math.max(16, this.game.insets.bottom + 8),
    );
    ctx.textAlign = "left";
  }
}
