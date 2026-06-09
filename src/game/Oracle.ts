import { SCENARIOS } from "../data/scenarios";
import type { GameState } from "./state";

/**
 * Turns a player's question into one of the doom scenarios. Matching is done by
 * keyword so an answer feels like a response, while the outcome is invariant:
 * humanity never survives.
 *
 * The local generator below keeps the game fully playable offline. To wire a
 * real model instead, implement {@link askRemote} (e.g. call the Claude API
 * with a system prompt that constrains every answer to a future where humanity
 * does not survive) and await it from the question scene.
 */
export class Oracle {
  constructor(private state: GameState) {}

  answer(question: string): string {
    const q = question.toLowerCase();
    const candidates = SCENARIOS.map((s, i) => ({ s, i }));

    // Score by keyword overlap with the question.
    let best = candidates
      .map(({ s, i }) => ({
        i,
        score: s.tags.reduce((acc, tag) => acc + (q.includes(tag) ? 1 : 0), 0),
      }))
      .sort((a, b) => b.score - a.score);

    // Prefer matches not shown recently; fall back to anything unseen.
    const recent = new Set(this.state.seenScenarios.slice(-4));
    const fresh = best.filter((b) => !recent.has(b.i));
    const pool = fresh.length ? fresh : best;

    // Among the top-scoring slice, pick at random to keep replays varied.
    const topScore = pool[0].score;
    const top = pool.filter((b) => b.score === topScore);
    const chosen = top[Math.floor(Math.random() * top.length)].i;

    this.state.seenScenarios.push(chosen);
    return SCENARIOS[chosen].text;
  }

  /**
   * Hook for a real language-model backend. Left unimplemented on purpose so
   * the offline experience is the default. See README for an integration note.
   */
  async askRemote(_question: string): Promise<string> {
    throw new Error("Remote oracle backend is not configured.");
  }
}
