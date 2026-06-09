import "./style.css";
import { Input } from "./core/Input";
import { UIOverlay } from "./core/ui";
import type { Game, Scene } from "./core/types";
import { createState } from "./game/state";
import { IntroScene } from "./scenes/IntroScene";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const uiRoot = document.getElementById("ui") as HTMLElement;

let current: Scene;

const game: Game = {
  canvas,
  ctx,
  width: window.innerWidth,
  height: window.innerHeight,
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
}
window.addEventListener("resize", resize);
resize();

// Boot.
current = new IntroScene();
current.enter(game);

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
