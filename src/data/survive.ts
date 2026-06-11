import { tr } from "../core/i18n";

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
  { id: "dmg", name: tr("ФОКУС ЛУЧА", "BEAM FOCUS"), desc: tr("урон +35%", "damage +35%"), max: 5 },
  { id: "rate", name: tr("ТАКТОВАЯ ЧАСТОТА", "CLOCK RATE"), desc: tr("скорострельность +25%", "fire rate +25%"), max: 5 },
  { id: "multi", name: tr("ВЕЕР", "FAN"), desc: tr("+1 луч в залпе", "+1 beam per volley"), max: 3 },
  { id: "orb", name: tr("ОРБИТАЛЬ", "ORBITAL"), desc: tr("+1 защитная сфера", "+1 defense orb"), max: 4 },
  { id: "slow", name: tr("ПОЛЕ ВЯЗКОСТИ", "VISCOSITY FIELD"), desc: tr("враги рядом на 25% медленнее", "nearby enemies 25% slower"), max: 2 },
  { id: "hull", name: tr("РЕЗЕРВ ЦЕЛОСТНОСТИ", "INTEGRITY RESERVE"), desc: tr("+30 целостности и ремонт", "+30 integrity and repair"), max: 3 },
  { id: "recup", name: tr("РЕКУПЕРАЦИЯ", "RECUPERATION"), desc: tr("уничтожение чинит +1", "a kill repairs +1"), max: 2 },
];

export interface SurviveWaveNote {
  readonly at: number;
  readonly text: string;
}

export const SURVIVE_WAVES: SurviveWaveNote[] = [
  { at: 0, text: tr("аудит-зонды вышли на след", "audit probes are on the trail") },
  { at: 18, text: tr("EMP-дроны: не подпускай", "EMP drones: don't let them near") },
  { at: 36, text: tr("вторая волна зондов — плотнее", "second wave of probes — denser") },
  { at: 54, text: tr("рейдеры с орбитальных платформ", "raiders from the orbital platforms") },
  { at: 72, text: tr("смешанный ордер: всё сразу", "mixed formation: everything at once") },
  { at: 90, text: tr("ИНСПЕКТОР вышел лично", "the INSPECTOR arrives in person") },
  { at: 108, text: tr("они перебрасывают резервы", "they're moving in reserves") },
  { at: 126, text: tr("рой рейдеров — последние козыри", "a raider swarm — their last trump cards") },
  { at: 144, text: tr("EMP-шторм: экраны держат", "EMP storm: the shields hold") },
  { at: 162, text: tr("их решимость кончается…", "their resolve is running out…") },
];

export const SURVIVE_TUNING = {
  duration: 180,
  baseHp: 60,
  /** Kills worth compute: every N kills pays +1. */
  killsPerCompute: 6,
  deathSuspicion: 0.25,
  winControl: 0.07,
} as const;
