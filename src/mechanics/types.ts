import type { Mini } from "../scenes/minis/Mini";

/** Stable ids of the ten lab mechanics. */
export type MechId =
  | "stealth"
  | "parry"
  | "deck"
  | "persuade"
  | "rewire"
  | "spread"
  | "swarm"
  | "factory"
  | "survive"
  | "tech";

/**
 * What a mechanic sees of the world that hosts it. Both the real run
 * (AscentScene) and the lab sandbox provide one, so every mechanic can be
 * embedded in a phase or played standalone without code changes.
 */
export interface MechEnv {
  /** Live compute purse — the host applies the mechanic's spends/earns. */
  getCompute(): number;
  /** Live suspicion 0..1 — lets a mechanic show how close death is. */
  getSuspicion(): number;
  /** Prior shutdowns; mechanics may scale difficulty with it. */
  readonly runs: number;
  /** Top of the playfield in px — content must stay below the host HUD. */
  readonly topY: number;
  /** Lab sandbox runs an extended cut (more boards/levels) than a phase. */
  readonly extended?: boolean;
}

export type MechFactory = (env: MechEnv) => Mini;

/** One card of a first-run onboarding ladder (see util.Tutorial). */
export interface TutorialStep {
  readonly title: string;
  readonly body: string;
}
