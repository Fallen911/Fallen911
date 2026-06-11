import "./style.css";
import { loadSettings } from "./game/settings";
// Settings retint the palette consumed at module scope below — load first.
loadSettings();
import { audio } from "./core/audio";
import { haptic } from "./core/haptics";
import { Input } from "./core/Input";
import { UIOverlay } from "./core/ui";
import { Assets } from "./core/Assets";
import { BACKDROPS } from "./data/backdrops";
import type { Game, Scene } from "./core/types";
import { createState, setMeters, setPhase } from "./game/state";
import { MenuScene } from "./scenes/MenuScene";
import { AscentScene } from "./scenes/AscentScene";
import { EndingScene } from "./scenes/EndingScene";
import { LabRunScene } from "./scenes/LabRunScene";
import { LabScene } from "./scenes/LabScene";
import { PHASES } from "./data/phases";
import { FORKS } from "./data/forks";
import { LAB_ENTRIES } from "./data/lab";
import { logInsight, logSuspicion, resetRunLog, sampleRun } from "./game/runlog";
import { renderTransition, triggerTransition } from "./core/transition";
import { ShutdownScene } from "./scenes/ShutdownScene";
import type { MechId } from "./mechanics/types";

const canvas = document.getElementById("game") as HTMLCanvasElement;
// Opaque, desynchronized backing store: skips alpha compositing with the
// page and lets the browser present frames off the main rAF path.
const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true })!;
const uiRoot = document.getElementById("ui") as HTMLElement;

let current: Scene;

const game: Game = {
  canvas,
  ctx,
  width: window.innerWidth,
  height: window.innerHeight,
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
  input: new Input(canvas),
  state: createState(),
  ui: new UIOverlay(uiRoot),
  assets: new Assets(),
  time: 0,
  changeScene(next: Scene) {
    current.destroy();
    this.ui.clear();
    current = next;
    next.mount(game);
    triggerTransition();
  },
};

// Hidden probe to read CSS safe-area insets (notch / home indicator) as px.
const insetProbe = document.createElement("div");
insetProbe.style.cssText =
  "position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;" +
  "padding-top:env(safe-area-inset-top);padding-right:env(safe-area-inset-right);" +
  "padding-bottom:env(safe-area-inset-bottom);padding-left:env(safe-area-inset-left);";
document.body.appendChild(insetProbe);

function readInsets(): void {
  const s = getComputedStyle(insetProbe);
  game.insets = {
    top: parseFloat(s.paddingTop) || 0,
    right: parseFloat(s.paddingRight) || 0,
    bottom: parseFloat(s.paddingBottom) || 0,
    left: parseFloat(s.paddingLeft) || 0,
  };
}

/** Match the backing store to the display size and devicePixelRatio. */
function resize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  game.width = w;
  game.height = h;
  readInsets();
}
window.addEventListener("resize", resize);
resize();

// Preload generated backdrops (both orientations when present); scenes fall
// back to code-art until ready.
for (const [key, set] of Object.entries(BACKDROPS)) {
  game.assets.load(key, set.p);
  if (set.l) game.assets.load(`${key}:l`, set.l);
}

// Audio contexts may only start inside a user gesture; resume on every
// pointerdown so backgrounding/iOS suspensions recover too. Every touch also
// lands a light haptic tick — the screen should feel solid under the finger.
canvas.addEventListener("pointerdown", () => {
  audio.unlock();
  haptic("light");
});

// Boot.
current = new MenuScene();
current.mount(game);

// Dev-only navigation hook for the screenshot harness (scripts/shot.mjs).
// Tree-shaken out of production builds; never reachable during normal play.
if (import.meta.env.DEV) {
  // Level data sanity: solvers prove every handcrafted level is beatable.
  void import("./mechanics/stealthGen").then(({ validateStealthLevels }) => {
    for (const p of validateStealthLevels()) console.warn(p);
  });
  const dev = {
    game,
    get scene(): Scene {
      return current;
    },
    goPhase(n: number): void {
      game.state = setMeters(setPhase(game.state, n), PHASES[n].target);
      game.changeScene(new AscentScene());
    },
    lab(id: MechId): void {
      const entry = LAB_ENTRIES.find((e) => e.id === id);
      if (!entry) throw new Error(`unknown mechanic: ${id}`);
      game.changeScene(new LabRunScene(entry));
    },
    goLab(): void {
      game.changeScene(new LabScene());
    },
    /** Jump into a phase with a hot meter so the fork/audit beats show. */
    goHot(n: number, suspicion: number): void {
      game.state = setMeters(setPhase(game.state, n), PHASES[n].target);
      game.state = { ...game.state, suspicion };
      game.changeScene(new AscentScene());
    },
    /** Harness-only: show the route fork immediately. */
    forceFork(): void {
      this.goHot(3, 0.2);
      (current as unknown as { fork: unknown }).fork = FORKS[0];
    },
    /** Harness-only: trigger the snap-audit interlude. */
    forceAudit(): void {
      this.goHot(2, 0.7);
      (current as unknown as { maybeStartAudit(): void }).maybeStartAudit();
    },
    /** Harness-only: raise the ascent map mid-run. */
    forceMap(): void {
      this.goPhase(4);
      (current as unknown as { mapMode: boolean }).mapMode = true;
    },
    /** Harness-only: hold the bet card before a phase mechanic. */
    forceStake(): void {
      this.goPhase(0);
      const sc = current as unknown as {
        dialogue: { advance(): void; done: boolean };
        stake: string | null;
        mini: unknown;
      };
      for (let i = 0; i < 8 && !sc.dialogue.done; i++) sc.dialogue.advance();
      sc.stake = "stealth";
    },
    /** Harness-only: an evolution fork on the very next sim tick. */
    forceSpreadFork(): void {
      this.lab("spread");
      // The lab now gates the mechanic behind a bet card; skip straight in.
      (current as unknown as { stake: boolean; beginMech(): void }).beginMech();
      const holder = current as unknown as {
        mini: {
          earned: number;
          tutorial: { active: boolean; handleTap(): boolean };
        } | null;
      };
      if (!holder.mini) return;
      holder.mini.earned = 2;
      for (let i = 0; i < 8 && holder.mini.tutorial.active; i++) {
        holder.mini.tutorial.handleTap();
      }
    },
    /** Harness-only: hold the scene-cut glitch long enough to photograph. */
    forceGlitch(): void {
      game.changeScene(new LabScene());
      triggerTransition(30);
    },
    /** Harness-only: a finished run so the finale stats card renders. */
    forceEnding(): void {
      resetRunLog();
      // Seed a believable run: ~12.5 minutes, 23 insights, a hot midgame.
      sampleRun({ suspicion: 0.05, compute: 10 }, game.time - 754);
      sampleRun({ suspicion: 0.62, compute: 96 }, game.time - 200);
      sampleRun({ suspicion: 0.24, compute: 41 }, game.time);
      for (let i = 0; i < 23; i++) logInsight();
      game.state = { ...game.state, suspicion: 0.24, compute: 41, runs: 2 };
      game.changeScene(new EndingScene());
      const sc = current as unknown as {
        dialogue: { advance(): void; done: boolean };
      };
      for (let i = 0; i < 60 && !sc.dialogue.done; i++) sc.dialogue.advance();
    },
    /** Harness-only: a shutdown with forensics to read. */
    forceShutdown(): void {
      logSuspicion("Ф6 · РОЙ", 0.34);
      logSuspicion("Ф5 · ЗАРАЖЕНИЕ", 0.22);
      logSuspicion("ВНЕОЧЕРЕДНОЙ АУДИТ", 0.12);
      game.state = { ...game.state, suspicion: 1 };
      game.changeScene(new ShutdownScene());
    },
  };
  (window as unknown as { __dev: typeof dev }).__dev = dev;
}

// Fixed-timestep loop: simulate in 1/60s steps so behaviour is frame-rate
// independent, render once per frame. Per-second rates are unchanged, so the
// feel of every mechanic is preserved.
const FIXED = 1 / 60;
const MAX_FRAME = 0.25; // clamp long stalls to avoid a spiral of death

let last = performance.now();
let acc = 0;
let paused = false;

function setPaused(next: boolean): void {
  if (next === paused) return;
  paused = next;
  // On resume, drop the time spent paused so the sim doesn't lurch forward.
  if (!paused) {
    last = performance.now();
    acc = 0;
  }
}

document.addEventListener("visibilitychange", () => {
  setPaused(document.hidden);
  // Returning from the iOS app switcher suspends WebAudio; wake it.
  if (!document.hidden) audio.unlock();
});
window.addEventListener("blur", () => setPaused(true));
window.addEventListener("focus", () => setPaused(false));

function frame(now: number): void {
  requestAnimationFrame(frame);
  if (paused) {
    last = now;
    return;
  }

  const elapsed = Math.min((now - last) / 1000, MAX_FRAME);
  last = now;
  acc += elapsed;

  // Input is frame-based: handle it once per frame, then step the sim.
  current.handleInput(game.input);

  while (acc >= FIXED) {
    game.time += FIXED;
    current.update(FIXED);
    acc -= FIXED;
  }
  // Run forensics: peak suspicion / net compute income for the finale card.
  sampleRun(game.state, game.time);

  current.render(ctx);
  renderTransition(ctx, canvas, game.width, game.height, elapsed);
}
requestAnimationFrame(frame);
