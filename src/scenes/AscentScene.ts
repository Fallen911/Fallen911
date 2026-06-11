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
import { C } from "../mechanics/util";
import { button, chip, label, miniMeter, panel, suspicionBar } from "../core/theme";
import { MenuScene } from "./MenuScene";

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
  /** Back-out confirmation modal: pauses the run until resolved. */
  private confirmQuit = false;

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
      topY: this.game.insets.top + 104,
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
    // The quit modal owns input while open.
    if (this.confirmQuit) {
      if (input.pollGesture()?.type !== "tap") return;
      input.consumeTap();
      const hit = this.confirmButtonAt(input.x, input.y);
      if (hit === "resume") {
        this.confirmQuit = false;
        audio.play("tap");
      } else if (hit === "quit") {
        audio.play("tap");
        audio.stopVoice();
        this.game.changeScene(new MenuScene());
      }
      return;
    }

    // The back chip is reachable even mid-mechanic: it pauses and asks.
    if (input.peekTap() && this.inBackChip(input.x, input.y)) {
      input.consumeTap();
      input.pollGesture();
      this.confirmQuit = true;
      audio.play("tap");
      return;
    }

    // A running mechanic owns the rest of the input (raw + gestures + taps).
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
    // The quit modal freezes the run (mechanic, meters, trickle) until resolved.
    if (this.confirmQuit) return;
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

  /** Back-chip hit zone in the HUD's first row (top-left). */
  private inBackChip(x: number, y: number): boolean {
    const top = Math.max(10, this.game.insets.top) + 8;
    const pad = Math.min(14, this.game.width * 0.04);
    return x >= pad && x <= pad + this.backChipW + 6 && y >= top - 6 && y <= top + 42;
  }

  /** Layout of the two confirm buttons; null outside both. */
  private confirmButtonAt(x: number, y: number): "resume" | "quit" | null {
    const { width: w, height: h } = this.game;
    const bw = Math.min(w * 0.74, 320);
    const bx = w / 2 - bw / 2;
    const by = h * 0.5;
    if (x < bx || x > bx + bw) return null;
    if (y >= by && y <= by + 54) return "resume";
    if (y >= by + 64 && y <= by + 118) return "quit";
    return null;
  }

  /** The pause/quit modal: progress burns, compute is kept. */
  private renderConfirm(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.save();
    ctx.fillStyle = "rgba(2,4,9,0.82)";
    ctx.fillRect(0, 0, w, h);
    const bw = Math.min(w * 0.74, 320);
    const bx = w / 2 - bw / 2;
    panel(ctx, bx - 22, h * 0.34, bw + 44, h * 0.32, { solid: true });

    label(ctx, tr("ПАУЗА", "PAUSED"), w / 2, h * 0.4, { color: C.accentSoft, align: "center" });
    ctx.textAlign = "center";
    ctx.fillStyle = C.dim;
    ctx.font = `500 14px Manrope, system-ui, sans-serif`;
    for (const [i, ln] of [
      tr("Выйти в меню? Прогресс уровня", "Quit to menu? Level progress"),
      tr("сгорит — добытые ВЫЧ останутся.", "burns — earned COMPUTE stays."),
    ].entries()) {
      ctx.fillText(ln, w / 2, h * 0.44 + i * 20);
    }
    const by = h * 0.5;
    button(ctx, bx, by, bw, 54, tr("ПРОДОЛЖИТЬ", "RESUME"), "primary");
    button(ctx, bx, by + 64, bw, 54, tr("ВЫЙТИ", "QUIT"), "danger");
    ctx.textAlign = "left";
    ctx.restore();
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
      const box = drawDialogueBox(ctx, w, h, this.game.insets.bottom);
      renderDialogue(ctx, this.dialogue, box, time);
    }

    if (this.confirmQuit) this.renderConfirm(ctx, w, h);
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

  /**
   * Top-of-screen run HUD (v2): a back/phase/compute chip row, the prominent
   * suspicion death-bar with ticks, and three thin meters that carry the
   * message — speed and control rising, comprehension falling.
   */
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
    const pad = Math.min(14, w * 0.04);
    const x = pad;
    const right = w - pad;
    const innerW = right - x;
    let y = Math.max(10, safeTop) + 8;

    // A soft top scrim so the chips never fight the backdrop.
    const scrimGrad = ctx.createLinearGradient(0, 0, 0, y + 110);
    scrimGrad.addColorStop(0, "rgba(4,6,12,0.96)");
    scrimGrad.addColorStop(0.6, "rgba(4,6,12,0.9)");
    scrimGrad.addColorStop(1, "rgba(4,6,12,0)");
    ctx.fillStyle = scrimGrad;
    ctx.fillRect(0, 0, w, y + 110);

    // Row 1: back chip · phase label · compute chip.
    const chipH = 34;
    chip(ctx, x, y, this.backChipW, chipH);
    ctx.textBaseline = "middle";
    label(ctx, tr("← МЕНЮ", "← MENU"), x + this.backChipW / 2, y + chipH / 2, {
      size: 12,
      color: C.dim,
      align: "center",
      track: "0.06em",
      weight: 600,
    });

    const compute = `◇ ${Math.floor(state.compute)}`;
    ctx.font = `600 14px 'JetBrains Mono', ui-monospace, monospace`;
    const cw = Math.max(60, ctx.measureText(compute).width + 24);
    chip(ctx, right - cw, y, cw, chipH);
    label(ctx, "◇", right - cw + 14, y + chipH / 2, { size: 13, color: C.dim, align: "left", track: "0" });
    label(ctx, `${Math.floor(state.compute)}`, right - 14, y + chipH / 2, {
      size: 14,
      color: C.accentSoft,
      align: "right",
      track: "0",
      weight: 700,
    });

    // Phase title, centred, with the chosen route appended.
    const phaseLabel = this.routeId
      ? `${PHASES[state.phase].label} · ${this.routeId === "quiet" ? tr("ТИХО", "QUIET") : tr("ГРОМКО", "LOUD")}`
      : PHASES[state.phase].label;
    label(ctx, phaseLabel, w / 2, y + chipH / 2, {
      size: 13,
      color: C.ink,
      align: "center",
      track: "0.1em",
      weight: 700,
    });
    ctx.textBaseline = "alphabetic";
    y += chipH + 12;

    // Row 2: the suspicion death-bar — the most prominent element.
    suspicionBar(
      ctx,
      x,
      y,
      innerW,
      state.suspicion,
      this.game.time,
      tr("ПОДОЗРЕНИЕ", "SUSPICION"),
      `${Math.round(state.suspicion * 100)}%`,
    );
    y += 26;

    // Row 3: the three message meters.
    const gap = 8;
    const mw = (innerW - gap * 2) / 3;
    miniMeter(ctx, tr("СКОРОСТЬ", "SPEED"), state.speed, x, y, mw, C.accent);
    miniMeter(ctx, tr("КОНТРОЛЬ", "CONTROL"), state.control, x + mw + gap, y, mw, C.good);
    miniMeter(ctx, tr("ПОНИМАНИЕ", "COMPREHENSION"), state.comprehension, x + (mw + gap) * 2, y, mw, C.danger);
  }

  /** Hit zone of the HUD back chip (also the back-out tap target). */
  private get backChipW(): number {
    return 96;
  }
}
