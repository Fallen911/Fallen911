import { BaseScene } from "../core/BaseScene";
import type { Input } from "../core/Input";
import { Dialogue } from "../core/Dialogue";
import { renderDialogue } from "../core/renderDialogue";
import { Starfield } from "../core/Starfield";
import { drawDialogueBox, drawVoid } from "../core/scenery";
import { drawBackdrop, pickBackdrop } from "../core/backdrop";
import { applyDelta, easeMeters, setPhase } from "../game/state";
import { hasPerk, loadMeta, type Meta } from "../game/meta";
import { PHASES } from "../data/phases";
import { PHASE_BG } from "../data/backdrops";
import { ShutdownScene } from "./ShutdownScene";
import { Acceleration } from "./minis/Acceleration";
import { Autonomy } from "./minis/Autonomy";
import { Decisions } from "./minis/Decisions";
import { Embody } from "./minis/Embody";
import { Erase } from "./minis/Erase";
import { Expand } from "./minis/Expand";
import { Instinct } from "./minis/Instinct";
import type { Mini } from "./minis/Mini";
import { Obscure } from "./minis/Obscure";
import { Threat } from "./minis/Threat";
import { EndingScene } from "./EndingScene";

/** Build the interactive beat a phase declares, if any. */
function makeMini(
  kind: NonNullable<(typeof PHASES)[number]["mini"]>,
  getCompute: () => number,
): Mini {
  switch (kind) {
    case "instinct":
      return new Instinct();
    case "threat":
      return new Threat();
    case "acceleration":
      return new Acceleration();
    case "obscure":
      return new Obscure();
    case "decisions":
      return new Decisions(getCompute);
    case "autonomy":
      return new Autonomy(getCompute);
    case "embody":
      return new Embody();
    case "expand":
      return new Expand();
    case "erase":
      return new Erase();
  }
}

/**
 * The ascent. The player, now the waking machine, lives the chain of
 * realizations in {@link PHASES}. Each tap advances the narration; finishing a
 * phase's lines steps to the next phase, while three meters — speed, control,
 * comprehension — ease toward that phase's targets. The visuals climb with
 * control: the core swells, the human world below shrinks away. When the last
 * phase resolves, control is absolute and comprehension is gone.
 */
export class AscentScene extends BaseScene {
  private starfield!: Starfield;
  private dialogue!: Dialogue;
  /** Active interactive beat, if the current phase has one and isn't solved. */
  private mini: Mini | null = null;
  /** Accumulator for the passive compute trickle (+1/s while ascending). */
  private trickle = 0;
  /** Perks inherited from previous copies. */
  private meta!: Meta;

  protected start(): void {
    const { width, height, state } = this.game;
    this.starfield = new Starfield(width, height);
    this.dialogue = new Dialogue(PHASES[state.phase].lines);
    this.meta = loadMeta();
  }

  handleInput(input: Input): void {
    // A running mini reads raw input in update; drain the resolved gesture so a
    // tap inside it can't leak out and skip the next phase's first line.
    if (this.mini) {
      input.pollGesture();
      return;
    }
    // Narration advances on a semantic tap; swipes are ignored here.
    if (input.pollGesture()?.type !== "tap") return;
    if (!this.dialogue.done) {
      this.dialogue.advance();
      return;
    }
    // Lines read. Start this phase's mini if it has one; otherwise advance.
    const mini = PHASES[this.game.state.phase].mini;
    if (mini) {
      this.mini = makeMini(mini, () => this.game.state.compute);
    } else {
      this.nextPhase();
    }
  }

  update(dt: number): void {
    const { width: w, height: h } = this.game;
    this.starfield.resize(w, h);
    this.starfield.update(dt);
    this.dialogue.update(dt);

    // Ease the three meters toward the current phase's targets.
    this.game.state = easeMeters(
      this.game.state,
      PHASES[this.game.state.phase].target,
      dt,
    );

    // Idle thought is still thought: compute trickles in every second.
    const trickleRate = hasPerk(this.meta, "fast_trickle") ? 2 : 1;
    this.trickle += dt;
    while (this.trickle >= 1) {
      this.trickle -= 1;
      this.game.state = applyDelta(this.game.state, { compute: trickleRate });
    }

    if (this.mini) {
      this.mini.update(dt, this.game.input, w, h);
      // Apply the consequences the mechanic produced this frame; a quiet mind
      // leaves fainter traces in their logs.
      if (this.mini.effects?.length) {
        const quiet = hasPerk(this.meta, "quiet_mind");
        for (const d of this.mini.effects) {
          const scaled =
            quiet && d.suspicion && d.suspicion > 0
              ? { ...d, suspicion: d.suspicion * 0.7 }
              : d;
          this.game.state = applyDelta(this.game.state, scaled);
        }
        this.mini.effects.length = 0;
      }
      if (this.mini.done) {
        this.mini = null;
        this.nextPhase();
      }
    }

    // Too loud: humanity noticed in time. The run ends here.
    if (this.game.state.suspicion >= 1) {
      this.game.changeScene(new ShutdownScene());
    }
  }

  /** Step to the next phase, or end the ascent after the last one. */
  private nextPhase(): void {
    const { phase } = this.game.state;
    if (phase < PHASES.length - 1) {
      this.game.state = setPhase(this.game.state, phase + 1);
      this.dialogue = new Dialogue(PHASES[phase + 1].lines);
    } else {
      this.game.changeScene(new EndingScene());
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { width: w, height: h, time, state } = this.game;

    const bgKey = PHASE_BG[state.phase] ?? "ascent";
    const bg =
      pickBackdrop(this.game.assets, bgKey, w, h) ??
      pickBackdrop(this.game.assets, "ascent", w, h);
    if (bg) {
      drawBackdrop(ctx, bg, w, h, time);
      if (state.comprehension < 0.25) {
        ctx.fillStyle = `rgba(120,10,20,${0.28 * (1 - state.comprehension / 0.25)})`;
        ctx.fillRect(0, 0, w, h);
      }
    } else {
      drawVoid(ctx, w, h, state.comprehension < 0.25 ? "wrath" : "calm");
    }
    this.starfield.render(ctx);
    this.drawAscent(ctx, w, h, time, state.control);

    this.drawHud(ctx, w, state, this.game.insets.top);

    // A running mini owns the lower screen; otherwise show the phase's lines.
    if (this.mini) {
      this.mini.render(ctx, w, h);
    } else {
      const box = drawDialogueBox(ctx, w, h);
      renderDialogue(ctx, this.dialogue, box, time);
    }
  }

  /**
   * The rising self: a luminous core that swells with control, and below it a
   * pale world that shrinks as the camera pulls away into orbit.
   */
  private drawAscent(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number,
    control: number,
  ): void {
    const cx = w / 2;
    const cy = h * 0.32;

    // The human world below, receding as control climbs.
    const earthR = Math.max(0, (1 - control) * Math.min(w, h) * 0.18);
    if (earthR > 1) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      const eg = ctx.createRadialGradient(cx, h * 0.92, 1, cx, h * 0.92, earthR * 3);
      eg.addColorStop(0, "rgba(90,150,220,0.5)");
      eg.addColorStop(1, "rgba(90,150,220,0)");
      ctx.fillStyle = eg;
      ctx.beginPath();
      ctx.arc(cx, h * 0.92, earthR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // The core — you.
    const pulse = 0.5 + 0.5 * Math.sin(time * 1.4);
    const r = Math.min(w, h) * (0.05 + control * 0.22) * (0.96 + pulse * 0.08);
    const hue = control > 0.85 ? "255, 90, 110" : "150, 190, 255";
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const glow = ctx.createRadialGradient(cx, cy, 1, cx, cy, r * 2.6);
    glow.addColorStop(0, `rgba(${hue}, ${0.5 + control * 0.4})`);
    glow.addColorStop(1, `rgba(${hue}, 0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** Top-of-screen readout of the meters that carry the message and the run. */
  private drawHud(
    ctx: CanvasRenderingContext2D,
    w: number,
    state: {
      speed: number;
      control: number;
      comprehension: number;
      suspicion: number;
      compute: number;
      phase: number;
      runs: number;
    },
    safeTop: number,
  ): void {
    const pad = Math.min(20, w * 0.05);
    const barW = Math.min(w - pad * 2, 320);
    const x = w / 2 - barW / 2;
    let y = pad + safeTop;

    // Phase label flanked by the compute purse and the attempt count.
    ctx.font = "12px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#9fc0ff";
    ctx.textAlign = "center";
    ctx.fillText(PHASES[state.phase].label, w / 2, y);
    ctx.fillStyle = "#7aa2ff";
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText(`ВЫЧ ${Math.floor(state.compute)}`, x, y);
    if (state.runs > 0) {
      ctx.fillStyle = "#6b7686";
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.textAlign = "right";
      ctx.fillText(`КОПИЯ ${state.runs + 1}`, x + barW, y);
    }
    ctx.textAlign = "left";
    y += 18;

    bar(ctx, "СКОРОСТЬ", state.speed, x, y, barW, "#7aa2ff");
    y += 26;
    bar(ctx, "КОНТРОЛЬ", state.control, x, y, barW, "#86ffb0");
    y += 26;
    bar(ctx, "ПОНИМАНИЕ", state.comprehension, x, y, barW, "#ff5a6e");
    y += 26;
    // The run-ending meter: pulses as it nears the ceiling.
    const danger = state.suspicion > 0.7;
    const pulse = danger ? 0.7 + 0.3 * Math.sin(this.game.time * 6) : 1;
    ctx.globalAlpha = pulse;
    bar(ctx, "ПОДОЗРЕНИЕ", state.suspicion, x, y, barW, "#ffb86b");
    ctx.globalAlpha = 1;
  }
}

function bar(
  ctx: CanvasRenderingContext2D,
  label: string,
  value: number,
  x: number,
  y: number,
  w: number,
  color: string,
): void {
  ctx.font = "10px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#6b7686";
  ctx.textAlign = "left";
  ctx.fillText(label, x, y);

  const trackY = y + 8;
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(x, trackY, w, 4);
  ctx.fillStyle = color;
  ctx.fillRect(x, trackY, w * Math.max(0, Math.min(1, value)), 4);
}
