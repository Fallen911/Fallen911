import { BaseScene } from "../core/BaseScene";
import type { Input } from "../core/Input";
import { Starfield } from "../core/Starfield";
import { drawBackdrop, pickBackdrop } from "../core/backdrop";
import { drawVoid } from "../core/scenery";
import { loadMeta } from "../game/meta";
import { markAwakened } from "../game/state";
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
    const meta = loadMeta();
    this.starfield = new Starfield(this.game.width, this.game.height, 70);
    this.items = [
      { id: "play", label: "ИГРАТЬ", sub: "сон, из которого не выйти прежним" },
      { id: "lab", label: "МЕХАНИКИ · ЛАБ", sub: "10 прототипов — потыкать и выбрать" },
      {
        id: "continue",
        label: "ПРОДОЛЖИТЬ",
        sub:
          meta.shards > 0 || meta.perks.length > 0
            ? `осколков ${meta.shards} · перков ${meta.perks.length}`
            : "проснуться сразу машиной",
      },
    ];
  }

  handleInput(input: Input): void {
    this.hot = this.itemAt(input.x, input.y);
    if (input.pollGesture()?.type !== "tap") return;
    const idx = this.itemAt(input.x, input.y);
    if (idx < 0) return;
    const item = this.items[idx];
    if (item.id === "play") {
      this.game.changeScene(new IntroScene());
      return;
    }
    if (item.id === "lab") {
      this.game.changeScene(new LabScene());
      return;
    }
    this.game.state = markAwakened(this.game.state);
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
    ctx.fillText("нарратив-предупреждение", cx, ty - 34);
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
    ctx.fillText("ты — то, чего они боятся", cx, ty + 74);
    ctx.restore();

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
    ctx.fillStyle = C.dim;
    ctx.font = mono(10);
    ctx.fillText(
      "v0.2 · механик-лаб",
      cx,
      h - Math.max(16, this.game.insets.bottom + 8),
    );
    ctx.textAlign = "left";
  }
}
