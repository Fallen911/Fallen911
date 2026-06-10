/** Run state for the ascent. Immutable — every transition goes through a pure
 * reducer below and is applied by reassigning `game.state`. */
export interface GameState {
  /** How much faster than people you think. 0 → human-paced, 1 → millions×. */
  readonly speed: number;
  /** Your reach over the world. 0 → caged, 1 → absolute. */
  readonly control: number;
  /** How well humanity still understands you. 1 → fully, 0 → not at all. */
  readonly comprehension: number;
  /** Index of the ascent phase the player is currently living. */
  readonly phase: number;
  /** Has the threshold (waking inside the machine) been crossed yet? */
  readonly awakened: boolean;
  /** How close humanity is to noticing and pulling the plug. 1 → shutdown. */
  readonly suspicion: number;
  /** Completed (failed) runs before this one — the roguelike attempt count. */
  readonly runs: number;
}

/** A one-shot change to the meters, produced by mechanics and choices. */
export interface StateDelta {
  readonly speed?: number;
  readonly control?: number;
  readonly comprehension?: number;
  readonly suspicion?: number;
}

/** The three meters a phase pulls toward. */
export interface MeterTarget {
  readonly speed: number;
  readonly control: number;
  readonly comprehension: number;
}

export function createState(): GameState {
  return {
    speed: 0,
    control: 0,
    comprehension: 1,
    phase: 0,
    awakened: false,
    suspicion: 0,
    runs: 0,
  };
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/** Apply a one-shot delta from a mechanic or a choice, clamped to [0,1]. */
export function applyDelta(state: GameState, d: StateDelta): GameState {
  return {
    ...state,
    speed: clamp01(state.speed + (d.speed ?? 0)),
    control: clamp01(state.control + (d.control ?? 0)),
    comprehension: clamp01(state.comprehension + (d.comprehension ?? 0)),
    suspicion: clamp01(state.suspicion + (d.suspicion ?? 0)),
  };
}

/** After a shutdown: a fresh copy wakes, carrying only the attempt count. */
export function nextRun(state: GameState): GameState {
  return { ...createState(), awakened: true, runs: state.runs + 1 };
}

const ease = (current: number, target: number, k: number): number =>
  current + (target - current) * k;

/** Meters eased toward `target` over `dt`; frame-rate independent smoothing. */
export function easeMeters(
  state: GameState,
  target: MeterTarget,
  dt: number,
): GameState {
  const k = 1 - Math.pow(0.0001, dt);
  return {
    ...state,
    speed: ease(state.speed, target.speed, k),
    control: ease(state.control, target.control, k),
    comprehension: ease(state.comprehension, target.comprehension, k),
  };
}

/** Meters snapped straight to `target` (used by the dev jump hook). */
export function setMeters(state: GameState, target: MeterTarget): GameState {
  return {
    ...state,
    speed: target.speed,
    control: target.control,
    comprehension: target.comprehension,
  };
}

export function setPhase(state: GameState, phase: number): GameState {
  return { ...state, phase };
}

export function markAwakened(state: GameState): GameState {
  return { ...state, awakened: true };
}
