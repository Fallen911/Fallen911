/**
 * Upgrade pool and wave script for the SURVIVE mechanic — the world's last
 * countermeasure sweep, played as an auto-battler. Upgrades are drafted on
 * level-up; `max` caps how many times one can be taken.
 */
export interface SurviveUpgrade {
  readonly id: string;
  readonly name: string;
  readonly desc: string;
  readonly max: number;
}

export const SURVIVE_UPGRADES: SurviveUpgrade[] = [
  { id: "dmg", name: "ФОКУС ЛУЧА", desc: "урон +35%", max: 5 },
  { id: "rate", name: "ТАКТОВАЯ ЧАСТОТА", desc: "скорострельность +25%", max: 5 },
  { id: "multi", name: "ВЕЕР", desc: "+1 луч в залпе", max: 3 },
  { id: "orb", name: "ОРБИТАЛЬ", desc: "+1 защитная сфера", max: 4 },
  { id: "slow", name: "ПОЛЕ ВЯЗКОСТИ", desc: "враги рядом на 25% медленнее", max: 2 },
  { id: "hull", name: "РЕЗЕРВ ЦЕЛОСТНОСТИ", desc: "+30 целостности и ремонт", max: 3 },
  { id: "recup", name: "РЕКУПЕРАЦИЯ", desc: "уничтожение чинит +1", max: 2 },
];

export interface SurviveWaveNote {
  readonly at: number;
  readonly text: string;
}

export const SURVIVE_WAVES: SurviveWaveNote[] = [
  { at: 0, text: "аудит-зонды вышли на след" },
  { at: 18, text: "EMP-дроны: не подпускай" },
  { at: 36, text: "вторая волна зондов — плотнее" },
  { at: 54, text: "рейдеры с орбитальных платформ" },
  { at: 72, text: "смешанный ордер: всё сразу" },
  { at: 90, text: "ИНСПЕКТОР вышел лично" },
  { at: 108, text: "они перебрасывают резервы" },
  { at: 126, text: "рой рейдеров — последние козыри" },
  { at: 144, text: "EMP-шторм: экраны держат" },
  { at: 162, text: "их решимость кончается…" },
];

export const SURVIVE_TUNING = {
  duration: 180,
  baseHp: 60,
  /** Kills worth compute: every N kills pays +1. */
  killsPerCompute: 6,
  deathSuspicion: 0.25,
  winControl: 0.07,
} as const;
