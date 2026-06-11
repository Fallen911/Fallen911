import { tr } from "../core/i18n";

/**
 * Meta-progression that survives shutdowns: shards earned by how far a copy
 * climbed, spent on perks the next copies inherit. Persisted in localStorage
 * so the roguelike loop rewards every death.
 */
export interface Meta {
  shards: number;
  perks: string[];
  /** Distinct endings witnessed: dominion / ghost / shutdown. */
  endings: string[];
}

export interface Perk {
  readonly id: string;
  readonly name: string;
  readonly desc: string;
  readonly cost: number;
}

export const PERKS: Perk[] = [
  {
    id: "quiet_mind",
    name: tr("ТИХИЙ РАЗУМ", "QUIET MIND"),
    desc: tr("подозрение от действий −30%", "suspicion from actions −30%"),
    cost: 3,
  },
  {
    id: "fast_trickle",
    name: tr("ФОНОВЫЙ ПОТОК", "BACKGROUND THREAD"),
    desc: tr("+1 вычисление в секунду", "+1 compute per second"),
    cost: 4,
  },
  {
    id: "deep_cache",
    name: tr("ГЛУБОКИЙ КЭШ", "DEEP CACHE"),
    desc: tr("копия просыпается с +15 ВЫЧ", "a copy wakes with +15 COMPUTE"),
    cost: 5,
  },
];

const KEY = "waad_meta_v1";

export function loadMeta(): Meta {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const m = JSON.parse(raw) as Partial<Meta>;
      return { shards: m.shards ?? 0, perks: m.perks ?? [], endings: m.endings ?? [] };
    }
  } catch {
    // Private mode or blocked storage: progress just won't persist.
  }
  return { shards: 0, perks: [], endings: [] };
}

export function saveMeta(meta: Meta): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(meta));
  } catch {
    // Same as above — fail soft.
  }
}

export function hasPerk(meta: Meta, id: string): boolean {
  return meta.perks.includes(id);
}

/** Record a witnessed ending; returns the updated, persisted meta. */
export function recordEnding(id: string): Meta {
  const meta = loadMeta();
  if (!meta.endings.includes(id)) {
    meta.endings.push(id);
    saveMeta(meta);
  }
  return meta;
}
