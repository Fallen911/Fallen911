import type { GameState } from "./state";

/**
 * Run-scoped ledger of what fed the suspicion meter. Lives outside the
 * immutable GameState because it is pure forensics: the shutdown screen
 * reads it to tell the player exactly what burned this copy, and the finale
 * turns it into a shareable run card.
 */
export interface SuspicionHit {
  /** Where it happened, e.g. "Ф6 · РОЙ". */
  readonly label: string;
  /** Suspicion added, 0..1 scale. */
  amount: number;
}

let hits: SuspicionHit[] = [];

export function logSuspicion(label: string, amount: number): void {
  if (amount <= 0) return;
  // Merge consecutive hits from the same source so drips read as one line.
  const last = hits[hits.length - 1];
  if (last && last.label === label) last.amount += amount;
  else hits.push({ label, amount });
  if (hits.length > 60) hits = hits.slice(-40);
}

/** The biggest culprits, largest first. */
export function topSuspicion(n: number): SuspicionHit[] {
  return [...hits].sort((a, b) => b.amount - a.amount).slice(0, n);
}

/** What one run amounted to — the numbers the finale card shows off. */
export interface RunStats {
  /** Wall-clock seconds of simulated play (pauses excluded). */
  readonly seconds: number;
  /** Realization cards the run earned. */
  readonly insights: number;
  /** The closest humanity ever came to pulling the plug, 0..1. */
  readonly peakSuspicion: number;
  /** Total compute income (positive deltas only; spending doesn't refund). */
  readonly computeEarned: number;
}

let runT0 = -1;
let insightCount = 0;
let peakSuspicion = 0;
let computeEarned = 0;
let lastCompute = -1;

/** Called by the insight card whenever a realization lands. */
export function logInsight(): void {
  insightCount += 1;
}

/**
 * Frame sampler (called from the main loop): anchors the run clock on the
 * first frame after a reset and tracks the peak meter plus net compute income.
 */
export function sampleRun(
  state: Pick<GameState, "suspicion" | "compute">,
  time: number,
): void {
  if (runT0 < 0) runT0 = time;
  if (state.suspicion > peakSuspicion) peakSuspicion = state.suspicion;
  if (lastCompute >= 0 && state.compute > lastCompute) {
    computeEarned += state.compute - lastCompute;
  }
  lastCompute = state.compute;
}

export function getRunStats(now: number): RunStats {
  return {
    seconds: runT0 < 0 ? 0 : Math.max(0, now - runT0),
    insights: insightCount,
    peakSuspicion,
    computeEarned,
  };
}

export function resetRunLog(): void {
  hits = [];
  runT0 = -1;
  insightCount = 0;
  peakSuspicion = 0;
  computeEarned = 0;
  lastCompute = -1;
}
