import type { Game, Scene } from "./types";

/**
 * Convenience base: captures the {@link Game} on enter so subclasses can read
 * `this.game` everywhere, and exposes optional `start`/`stop` hooks.
 */
export abstract class BaseScene implements Scene {
  protected game!: Game;

  enter(game: Game): void {
    this.game = game;
    this.start();
  }

  exit(): void {
    this.stop();
  }

  /** Called once when the scene becomes active. */
  protected start(): void {}

  /** Called once when the scene is replaced. */
  protected stop(): void {}

  abstract update(dt: number): void;
  abstract render(ctx: CanvasRenderingContext2D): void;
}
