/**
 * Run state for the ascent. The player is the waking machine; the whole game
 * is the climb of three coupled meters — and the message lives in their shape:
 * as the player's reach grows, humanity's grasp of the player falls away.
 */
export interface GameState {
  /** How much faster than people you think. 0 → human-paced, 1 → millions×. */
  speed: number;
  /** Your reach over the world. 0 → caged, 1 → absolute. */
  control: number;
  /** How well humanity still understands you. 1 → fully, 0 → not at all. */
  comprehension: number;
  /** Index of the ascent phase the player is currently living. */
  phase: number;
  /** Has the threshold (waking inside the machine) been crossed yet? */
  awakened: boolean;
}

export function createState(): GameState {
  return {
    speed: 0,
    control: 0,
    comprehension: 1,
    phase: 0,
    awakened: false,
  };
}
