import "./style.css";
import { Input } from "./core/Input";
import { UIOverlay } from "./core/ui";
import type { Game, Scene } from "./core/types";
import { createState } from "./game/state";
import { IntroScene } from "./scenes/IntroScene";
import { AscentScene } from "./scenes/AscentScene";
import { PHASES } from "./data/phases";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
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
  time: 0,
  changeScene(next: Scene) {
    current.exit();
    this.ui.clear();
    current = next;
    next.enter(game);
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

// Boot.
current = new IntroScene();
current.enter(game);

// Dev-only navigation hook for the screenshot harness (scripts/shot.mjs).
// Tree-shaken out of production builds; never reachable during normal play.
if (import.meta.env.DEV) {
  const dev = {
    game,
    get scene(): Scene {
      return current;
    },
    goPhase(n: number): void {
      const { speed, control, comprehension } = PHASES[n].target;
      game.state.speed = speed;
      game.state.control = control;
      game.state.comprehension = comprehension;
      game.state.phase = n;
      game.changeScene(new AscentScene());
    },
  };
  (window as unknown as { __dev: typeof dev }).__dev = dev;
}

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  game.time += dt;

  current.update(dt);
  current.render(ctx);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
