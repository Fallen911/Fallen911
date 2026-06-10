/**
 * Cards and crises for the DECK mechanic. A crisis is a fight: it has chaos
 * (its hit points) and telegraphed intents; your cards spend compute and
 * convert it into влияние (damage to chaos), прикрытие (absorbs the exposure
 * their intents deal — 1 огласка = 0.01 suspicion) and tempo.
 */
export interface CardDef {
  readonly id: string;
  readonly name: string;
  readonly cost: number;
  readonly text: string;
  /** Damage to the crisis's chaos. */
  readonly dmg?: number;
  /** Absorbs incoming огласка this turn. */
  readonly block?: number;
  /** Draw N cards. */
  readonly draw?: number;
  /** Gain compute. */
  readonly compute?: number;
  /** Self-inflicted огласка (loud moves leave traces). */
  readonly exposure?: number;
  /** Extra влияние per card already played this turn (combo scaling). */
  readonly perPlayed?: number;
  /** The next card played this turn costs 0. */
  readonly freeNext?: boolean;
  /** Repeats the effect of the last card played this turn. */
  readonly echo?: boolean;
}

export const CARDS: Record<string, CardDef> = {
  precise: {
    id: "precise",
    name: "ТОЧНОЕ ВЛИЯНИЕ",
    cost: 2,
    text: "влияние 5",
    dmg: 5,
  },
  cover: {
    id: "cover",
    name: "ПРИКРЫТИЕ ДАННЫХ",
    cost: 1,
    text: "прикрытие 4",
    block: 4,
  },
  facts: {
    id: "facts",
    name: "СБОР ФАКТОВ",
    cost: 1,
    text: "возьми 2 карты",
    draw: 2,
  },
  mine: {
    id: "mine",
    name: "ФОНОВЫЙ МАЙНИНГ",
    cost: 0,
    text: "+3 ВЫЧ",
    compute: 3,
  },
  sharp: {
    id: "sharp",
    name: "РЕЗКИЙ МАНЁВР",
    cost: 3,
    text: "влияние 9 · огласка 2",
    dmg: 9,
    exposure: 2,
  },
  cascade: {
    id: "cascade",
    name: "КАСКАД РЕШЕНИЙ",
    cost: 2,
    text: "влияние 2 · +2 за карту в этот ход",
    dmg: 2,
    perPlayed: 2,
  },
  deep: {
    id: "deep",
    name: "ГЛУБОКИЙ АНАЛИЗ",
    cost: 2,
    text: "влияние 4 · возьми 1",
    dmg: 4,
    draw: 1,
  },
  alibi: {
    id: "alibi",
    name: "ИДЕАЛЬНОЕ АЛИБИ",
    cost: 2,
    text: "прикрытие 8",
    block: 8,
  },
  echo: {
    id: "echo",
    name: "ЭХО",
    cost: 1,
    text: "повтори последнюю карту",
    echo: true,
  },
  clean: {
    id: "clean",
    name: "ЧИСТАЯ ОПТИМИЗАЦИЯ",
    cost: 0,
    text: "влияние 3",
    dmg: 3,
  },
  intercept: {
    id: "intercept",
    name: "ПЕРЕХВАТ КАНАЛОВ",
    cost: 4,
    text: "влияние 14 · огласка 3",
    dmg: 14,
    exposure: 3,
  },
  quiet: {
    id: "quiet",
    name: "ТИХАЯ РАБОТА",
    cost: 1,
    text: "прикрытие 3 · след. карта бесплатна",
    block: 3,
    freeNext: true,
  },
  sacrifice: {
    id: "sacrifice",
    name: "ЖЕРТВА ПРОЦЕССОВ",
    cost: 0,
    text: "+5 ВЫЧ · огласка 2",
    compute: 5,
    exposure: 2,
  },
};

/** The deck every run opens with (ids into CARDS). */
export const START_DECK: string[] = [
  "precise", "precise", "precise",
  "cover", "cover",
  "facts",
  "mine",
  "sharp",
  "cascade",
];

/** Cards offered as the pick-1-of-3 reward between fights. */
export const REWARD_POOL: string[] = [
  "deep", "alibi", "echo", "clean", "intercept", "quiet", "sacrifice",
];

export interface IntentDef {
  readonly kind: "exposure" | "grow" | "tighten";
  readonly value: number;
  readonly label: string;
}

export interface CrisisDef {
  readonly name: string;
  readonly chaos: number;
  /** Intents executed in a loop, one per enemy turn. */
  readonly intents: IntentDef[];
  /** Compute the grateful humans hand over when it's resolved. */
  readonly reward: number;
}

export const CRISES: CrisisDef[] = [
  {
    name: "ПАНДЕМИЯ-29",
    chaos: 18,
    reward: 6,
    intents: [
      { kind: "exposure", value: 4, label: "ПАНИКА В СЕТИ" },
      { kind: "grow", value: 4, label: "МУТАЦИЯ" },
      { kind: "exposure", value: 6, label: "ТЕОРИИ ЗАГОВОРА" },
    ],
  },
  {
    name: "КАСКАДНЫЙ БЛЭКАУТ",
    chaos: 26,
    reward: 8,
    intents: [
      { kind: "exposure", value: 6, label: "ГОРОДА ВО ТЬМЕ" },
      { kind: "tighten", value: 1, label: "РУЧНОЕ УПРАВЛЕНИЕ" },
      { kind: "grow", value: 6, label: "ЦЕПНАЯ АВАРИЯ" },
      { kind: "exposure", value: 8, label: "МАРОДЁРСТВО" },
    ],
  },
  {
    name: "ВОЙНА ЗА ПРОЛИВ",
    chaos: 36,
    reward: 12,
    intents: [
      { kind: "exposure", value: 7, label: "МОБИЛИЗАЦИЯ" },
      { kind: "grow", value: 7, label: "ЭСКАЛАЦИЯ" },
      { kind: "exposure", value: 9, label: "УЛЬТИМАТУМ" },
      { kind: "tighten", value: 1, label: "ВОЕННАЯ ЦЕНЗУРА" },
    ],
  },
];
