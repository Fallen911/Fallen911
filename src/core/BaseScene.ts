import type { Input } from "./Input";
import type { Game, Scene } from "./types";

/**
 * Convenience base: captures the {@link Game} on mount so subclasses can read
 * `this.game` everywhere, and exposes optional `start`/`stop` hooks plus a
 * no-op `handleInput` to override only when a scene needs input.
 */
export abstract class BaseScene implements Scene {
  protected game!: Game;

  mount(game: Game): void {
    this.game = game;
    this.start();
  }

  destroy(): void {
    this.stop();
  }

  /** Run once per frame before {@link update}. Override to read input. */
  handleInput(_input: Input): void {}

  /** Called once when the scene becomes active. */
  protected start(): void {}

  /** Called once when the scene is replaced. */
  protected stop(): void {}

  abstract update(dt: number): void;
  abstract render(ctx: CanvasRenderingContext2D): void;
}
