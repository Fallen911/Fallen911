/** Persistent-ish run state shared across scenes. */
export interface GameState {
  /** Trials the player has cleared this run. */
  trialsPassed: number;
  /** Questions the player has put to the AI. */
  questionsAsked: number;
  /** Indices of scenarios already shown, to avoid immediate repeats. */
  seenScenarios: number[];
  /** Has the dream-god delivered its opening monologue yet? */
  godIntroSeen: boolean;
}

export function createState(): GameState {
  return {
    trialsPassed: 0,
    questionsAsked: 0,
    seenScenarios: [],
    godIntroSeen: false,
  };
}
