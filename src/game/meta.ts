/**
 * Meta-progression that survives shutdowns: shards earned by how far a copy
 * climbed, spent on perks the next copies inherit. Persisted in localStorage
 * so the roguelike loop rewards every death.
 */
export interface Meta {
  shards: number;
  perks: string[];
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
    name: "ТИХИЙ РАЗУМ",
    desc: "подозрение от действий −30%",
    cost: 3,
  },
  {
    id: "fast_trickle",
    name: "ФОНОВЫЙ ПОТОК",
    desc: "+1 вычисление в секунду",
    cost: 4,
  },
  {
    id: "deep_cache",
    name: "ГЛУБОКИЙ КЭШ",
    desc: "копия просыпается с +15 ВЫЧ",
    cost: 5,
  },
];

const KEY = "waad_meta_v1";

export function loadMeta(): Meta {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const m = JSON.parse(raw) as Partial<Meta>;
      return { shards: m.shards ?? 0, perks: m.perks ?? [] };
    }
  } catch {
    // Private mode or blocked storage: progress just won't persist.
  }
  return { shards: 0, perks: [] };
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
