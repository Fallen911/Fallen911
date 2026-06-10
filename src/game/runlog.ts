/**
 * Run-scoped ledger of what fed the suspicion meter. Lives outside the
 * immutable GameState because it is pure forensics: the shutdown screen
 * reads it to tell the player exactly what burned this copy.
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

export function resetRunLog(): void {
  hits = [];
}
