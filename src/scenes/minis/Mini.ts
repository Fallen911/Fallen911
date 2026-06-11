import type { Input } from "../../core/Input";
import type { StateDelta } from "../../game/state";
import type { Goal } from "../../core/theme";

/**
 * An interactive beat played inside a phase. The owning scene drives it with
 * raw input and reports completion via {@link Mini.done}; the mini owns the
 * lower screen while active. Minis can't be lost outright, but mistakes and
 * greedy choices push state through {@link Mini.effects} — most importantly
 * suspicion, which is what ends a run.
 */
export interface Mini {
  done: boolean;
  /** One-shot state changes produced by play; the scene drains and applies. */
  effects?: StateDelta[];
  /**
   * The one task at hand, rendered by the host as the goal strip under the
   * HUD (v2 UX invariant: always answer "what do I do now"). Update freely —
   * the host reads it every frame.
   */
  goal?: Goal | null;
  update(dt: number, input: Input, w: number, h: number): void;
  render(ctx: CanvasRenderingContext2D, w: number, h: number): void;
}
