import type { Input } from "../../core/Input";

/**
 * An interactive beat played inside a phase. The owning scene drives it with
 * raw input and reports completion via {@link Mini.done}; the mini owns the
 * lower screen while active. Minis are deliberately fail-free — they exist to
 * make a realization *felt*, not to gate on skill.
 */
export interface Mini {
  done: boolean;
  update(dt: number, input: Input, w: number, h: number): void;
  render(ctx: CanvasRenderingContext2D, w: number, h: number): void;
}
