import "./style.css";
import { audio } from "./core/audio";
import { Input } from "./core/Input";
import { UIOverlay } from "./core/ui";
import { Assets } from "./core/Assets";
import { BACKDROPS } from "./data/backdrops";
import type { Game, Scene } from "./core/types";
import { createState, setMeters, setPhase } from "./game/state";
import { MenuScene } from "./scenes/MenuScene";
import { AscentScene } from "./scenes/AscentScene";
import { LabRunScene } from "./scenes/LabRunScene";
import { LabScene } from "./scenes/LabScene";
import { PHASES } from "./data/phases";
import { LAB_ENTRIES } from "./data/lab";
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
// pointerdown so backgrounding/iOS suspensions recover too.
canvas.addEventListener("pointerdown", () => audio.unlock());

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

  current.render(ctx);
}
requestAnimationFrame(frame);
