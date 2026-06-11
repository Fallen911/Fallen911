import { audio } from "../core/audio";
import { BaseScene } from "../core/BaseScene";
import type { Input } from "../core/Input";
import { Dialogue } from "../core/Dialogue";
import { renderDialogue } from "../core/renderDialogue";
import { Starfield } from "../core/Starfield";
import { drawDialogueBox, drawVoid } from "../core/scenery";
import { drawBackdrop, pickBackdrop } from "../core/backdrop";
import { wrapText } from "../core/text";
import { applyDelta, easeMeters, setPhase } from "../game/state";
import { logSuspicion } from "../game/runlog";
import { hasPerk, loadMeta, type Meta } from "../game/meta";
import { FORKS, type Fork, type ForkMods, type ForkOption } from "../data/forks";
import { PHASES } from "../data/phases";
import { PHASE_BG } from "../data/backdrops";
import { ShutdownScene } from "./ShutdownScene";
import type { Mini } from "./minis/Mini";
import { mechFactory } from "../mechanics/registry";
import type { MechEnv, MechId } from "../mechanics/types";
import { EndingScene } from "./EndingScene";
import { tr } from "../core/i18n";

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
  /** Route-fork choice screen, shown when entering a fork phase. */
  private fork: Fork | null = null;
  /** Multipliers of the chosen route, applied to every mechanic effect. */
  private mods: ForkMods = { susp: 1, comp: 1, ctrl: 1 };
  private routeId: "quiet" | "loud" | "" = "";
  /** A snap-audit interlude is running instead of a phase mechanic. */
  private auditMode = false;
  private auditBannerT = 0;
  /** Suspicion checkpoints that already triggered an audit this run. */
  private auditsFired = new Set<number>();
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

  /** What the embedded mechanics see of the run. */
  private mechEnv(): MechEnv {
    return {
      getCompute: () => this.game.state.compute,
      getSuspicion: () => this.game.state.suspicion,
      runs: this.game.state.runs,
      topY: this.game.insets.top + 124,
      variant: this.game.state.phase,
    };
  }

  private startMech(id: MechId): void {
    const factory = mechFactory(id);
    if (!factory) return;
    audio.stopVoice();
    this.mini = factory(this.mechEnv());
  }

  handleInput(input: Input): void {
    // A running mechanic owns the input completely (raw + gestures + taps).
    if (this.mini) return;

    // The fork screen owns input until a road is taken.
    if (this.fork) {
      if (input.pollGesture()?.type !== "tap") return;
      input.consumeTap();
      const pick = this.forkOptionAt(input.x, input.y);
      if (pick) this.chooseRoute(pick);
      return;
    }

    // Narration advances on a semantic tap; swipes are ignored here.
    if (input.pollGesture()?.type !== "tap") return;
    input.consumeTap();
    if (!this.dialogue.done) {
      this.dialogue.advance();
      return;
    }
    // Lines read. Start this phase's mechanic if it has one; otherwise advance.
    const mini = PHASES[this.game.state.phase].mini;
    if (mini) this.startMech(mini);
    else this.nextPhase();
  }

  update(dt: number): void {
    const { width: w, height: h } = this.game;
    const { comprehension, phase } = this.game.state;
    audio.setMood(comprehension < 0.25 ? "wrath" : phase >= 5 ? "tension" : "calm");
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
        const phaseLabel = PHASES[this.game.state.phase].label;
        for (const d of this.mini.effects) {
          // Route modifiers shape every gain; perks stack on top.
          let susp = (d.suspicion ?? 0) * (d.suspicion && d.suspicion > 0 ? this.mods.susp : 1);
          if (quiet && susp > 0) susp *= 0.7;
          const scaled = {
            ...d,
            suspicion: susp,
            compute: d.compute && d.compute > 0 ? d.compute * this.mods.comp : d.compute,
            control: d.control && d.control > 0 ? d.control * this.mods.ctrl : d.control,
          };
          if (susp > 0.005) {
            logSuspicion(this.auditMode ? tr("ВНЕОЧЕРЕДНОЙ АУДИТ", "EMERGENCY AUDIT") : phaseLabel, susp);
          }
          this.game.state = applyDelta(this.game.state, scaled);
        }
        this.mini.effects.length = 0;
      }
      if (this.mini.done) {
        const wasAudit = this.auditMode;
        this.mini = null;
        this.auditMode = false;
        // Eat anything latched inside the mechanic so its last tap can't
        // leak out and skip the next line of narration.
        this.game.input.consumeTap();
        this.game.input.pollGesture();
        if (wasAudit) {
          // Cleared in time: part of the trail is scrubbed.
          this.game.state = applyDelta(this.game.state, { suspicion: -0.12 });
          audio.play("good");
        } else {
          this.nextPhase();
        }
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
      // P0: route forks pause the climb; snap-audits punish a hot meter.
      this.fork = FORKS.find((f) => f.atPhase === phase + 1) ?? null;
      if (!this.fork) this.maybeStartAudit();
    } else {
      this.game.changeScene(new EndingScene());
    }
  }

  private chooseRoute(opt: ForkOption): void {
    this.mods = opt.mods;
    this.routeId = opt.id;
    this.fork = null;
    audio.play("tap");
    audio.speak(opt.chosen, "you");
    this.maybeStartAudit();
  }

  /**
   * A hot suspicion meter triggers an unscheduled audit between phases:
   * one tight rewire board. Clearing it scrubs part of the trail; the
   * board's own sweep timer is the punishment for fumbling it.
   */
  private maybeStartAudit(): void {
    const s = this.game.state.suspicion;
    for (const band of [0.6, 0.8]) {
      if (s >= band && !this.auditsFired.has(band)) {
        this.auditsFired.add(band);
        const factory = mechFactory("rewire");
        if (!factory) return;
        audio.stopVoice();
        audio.play("caught");
        this.mini = factory({ ...this.mechEnv(), audit: true });
        this.auditMode = true;
        this.auditBannerT = 2.4;
        return;
      }
    }
  }

  private forkOptionAt(x: number, y: number): ForkOption | null {
    if (!this.fork) return null;
    const { width: w, height: h } = this.game;
    const bw = Math.min(w * 0.86, 370);
    const bx = w / 2 - bw / 2;
    for (let i = 0; i < 2; i++) {
      const by = h * 0.4 + i * 132;
      if (x >= bx && x <= bx + bw && y >= by && y <= by + 116) return this.fork.options[i];
    }
    return null;
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
      if (this.auditBannerT > 0) {
        this.auditBannerT -= 1 / 60;
        ctx.textAlign = "center";
        ctx.font = "15px 'JetBrains Mono', monospace";
        ctx.fillStyle = `rgba(255,77,94,${Math.min(1, this.auditBannerT)})`;
        ctx.fillText(tr("ВНЕОЧЕРЕДНОЙ АУДИТ — подчисти каналы, пока они смотрят", "EMERGENCY AUDIT — scrub the channels while they watch"), w / 2, h * 0.5);
        ctx.textAlign = "left";
      }
    } else if (this.fork) {
      this.renderFork(ctx, w, h, time);
    } else {
      const box = drawDialogueBox(ctx, w, h);
      renderDialogue(ctx, this.dialogue, box, time);
    }
  }

  /** The route choice: two roads, two prices. */
  private renderFork(ctx: CanvasRenderingContext2D, w: number, h: number, time: number): void {
    const fork = this.fork as Fork;
    ctx.fillStyle = "rgba(3,4,8,0.82)";
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = "center";
    ctx.font = "16px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#e7edf6";
    ctx.fillText(fork.title, w / 2, h * 0.28);
    ctx.font = "italic 13px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#8b95a8";
    let py = h * 0.28 + 24;
    for (const ln of wrapText(ctx, fork.prompt, Math.min(w * 0.84, 360))) {
      ctx.fillText(ln, w / 2, py);
      py += 18;
    }

    const bw = Math.min(w * 0.86, 370);
    const bx = w / 2 - bw / 2;
    for (let i = 0; i < 2; i++) {
      const opt = fork.options[i];
      const by = h * 0.4 + i * 132;
      const quiet = opt.id === "quiet";
      ctx.fillStyle = "rgba(16,20,34,0.95)";
      ctx.strokeStyle = quiet ? "rgba(122,162,255,0.55)" : "rgba(255,150,90,0.55)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, 116, 14);
      ctx.fill();
      ctx.stroke();
      ctx.textAlign = "left";
      ctx.font = "15px 'JetBrains Mono', monospace";
      ctx.fillStyle = quiet ? "#9fc0ff" : "#ffb86b";
      ctx.fillText(opt.name, bx + 18, by + 30);
      ctx.font = "12px Inter, system-ui, sans-serif";
      ctx.fillStyle = "#6b7686";
      const parts = opt.desc.split(" · ");
      ctx.fillText(parts.slice(0, 2).join(" · "), bx + 18, by + 52);
      if (parts[2]) ctx.fillText(parts[2], bx + 18, by + 68);
      ctx.font = "italic 12px Inter, system-ui, sans-serif";
      ctx.fillStyle = "#b9c2d4";
      ctx.fillText(quiet ? tr("медленнее. тише. дольше живёшь.", "slower. quieter. you live longer.") : tr("быстрее. громче. ярче горишь.", "faster. louder. you burn brighter."), bx + 18, by + 92);
      ctx.textAlign = "center";
    }
    ctx.globalAlpha = 0.5 + 0.35 * Math.sin(time * 3);
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#6b7686";
    ctx.fillText(tr("выбери дорогу — она действует до следующей развилки", "choose a road — it holds until the next fork"), w / 2, h * 0.4 + 132 * 2 + 16);
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
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
    ctx.fillText(
      this.routeId ? `${PHASES[state.phase].label} · ${this.routeId === "quiet" ? tr("ТИХО", "QUIET") : tr("ГРОМКО", "LOUD")}` : PHASES[state.phase].label,
      w / 2,
      y,
    );
    ctx.fillStyle = "#7aa2ff";
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText(tr(`ВЫЧ ${Math.floor(state.compute)}`, `COMPUTE ${Math.floor(state.compute)}`), x, y);
    if (state.runs > 0) {
      ctx.fillStyle = "#6b7686";
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.textAlign = "right";
      ctx.fillText(tr(`КОПИЯ ${state.runs + 1}`, `COPY ${state.runs + 1}`), x + barW, y);
    }
    ctx.textAlign = "left";
    y += 18;

    bar(ctx, tr("СКОРОСТЬ", "SPEED"), state.speed, x, y, barW, "#7aa2ff");
    y += 26;
    bar(ctx, tr("КОНТРОЛЬ", "CONTROL"), state.control, x, y, barW, "#86ffb0");
    y += 26;
    bar(ctx, tr("ПОНИМАНИЕ", "UNDERSTANDING"), state.comprehension, x, y, barW, "#ff5a6e");
    y += 26;
    // The run-ending meter: pulses as it nears the ceiling.
    const danger = state.suspicion > 0.7;
    const pulse = danger ? 0.7 + 0.3 * Math.sin(this.game.time * 6) : 1;
    ctx.globalAlpha = pulse;
    bar(ctx, tr("ПОДОЗРЕНИЕ", "SUSPICION"), state.suspicion, x, y, barW, "#ffb86b");
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
