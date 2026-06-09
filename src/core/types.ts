import type { Input } from "./Input";
import type { UIOverlay } from "./ui";
import type { GameState } from "../game/state";

/**
 * Shared services every scene receives. Logical drawing units equal CSS
 * pixels — the canvas is scaled by devicePixelRatio behind the scenes, so
 * `width`/`height` and pointer coordinates are always in the same space.
 */
export interface Game {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  /** Safe-area insets (CSS px) so canvas UI can dodge the notch / home bar. */
  insets: { top: number; right: number; bottom: number; left: number };
  input: Input;
  state: GameState;
  ui: UIOverlay;
  /** Elapsed seconds since boot — handy for ambient animation. */
  time: number;
  changeScene(next: Scene): void;
}

export interface Scene {
  enter(game: Game): void;
  exit(): void;
  update(dt: number): void;
  render(ctx: CanvasRenderingContext2D): void;
}
