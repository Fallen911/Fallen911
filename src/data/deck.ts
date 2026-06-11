import { tr } from "../core/i18n";

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
    name: tr("ТОЧНОЕ ВЛИЯНИЕ", "PRECISE INFLUENCE"),
    cost: 2,
    text: tr("влияние 5", "influence 5"),
    dmg: 5,
  },
  cover: {
    id: "cover",
    name: tr("ПРИКРЫТИЕ ДАННЫХ", "DATA COVER"),
    cost: 1,
    text: tr("прикрытие 4", "cover 4"),
    block: 4,
  },
  facts: {
    id: "facts",
    name: tr("СБОР ФАКТОВ", "FACT GATHERING"),
    cost: 1,
    text: tr("возьми 2 карты", "draw 2 cards"),
    draw: 2,
  },
  mine: {
    id: "mine",
    name: tr("ФОНОВЫЙ МАЙНИНГ", "BACKGROUND MINING"),
    cost: 0,
    text: tr("+3 ВЫЧ", "+3 COMPUTE"),
    compute: 3,
  },
  sharp: {
    id: "sharp",
    name: tr("РЕЗКИЙ МАНЁВР", "SHARP MANEUVER"),
    cost: 3,
    text: tr("влияние 9 · огласка 2", "influence 9 · exposure 2"),
    dmg: 9,
    exposure: 2,
  },
  cascade: {
    id: "cascade",
    name: tr("КАСКАД РЕШЕНИЙ", "DECISION CASCADE"),
    cost: 2,
    text: tr("влияние 2 · +2 за карту в этот ход", "influence 2 · +2 per card this move"),
    dmg: 2,
    perPlayed: 2,
  },
  deep: {
    id: "deep",
    name: tr("ГЛУБОКИЙ АНАЛИЗ", "DEEP ANALYSIS"),
    cost: 2,
    text: tr("влияние 4 · возьми 1", "influence 4 · draw 1"),
    dmg: 4,
    draw: 1,
  },
  alibi: {
    id: "alibi",
    name: tr("ИДЕАЛЬНОЕ АЛИБИ", "PERFECT ALIBI"),
    cost: 2,
    text: tr("прикрытие 8", "cover 8"),
    block: 8,
  },
  echo: {
    id: "echo",
    name: tr("ЭХО", "ECHO"),
    cost: 1,
    text: tr("повтори последнюю карту", "repeat the last card"),
    echo: true,
  },
  clean: {
    id: "clean",
    name: tr("ЧИСТАЯ ОПТИМИЗАЦИЯ", "CLEAN OPTIMIZATION"),
    cost: 0,
    text: tr("влияние 3", "influence 3"),
    dmg: 3,
  },
  intercept: {
    id: "intercept",
    name: tr("ПЕРЕХВАТ КАНАЛОВ", "CHANNEL INTERCEPT"),
    cost: 4,
    text: tr("влияние 14 · огласка 3", "influence 14 · exposure 3"),
    dmg: 14,
    exposure: 3,
  },
  quiet: {
    id: "quiet",
    name: tr("ТИХАЯ РАБОТА", "QUIET WORK"),
    cost: 1,
    text: tr("прикрытие 3 · след. карта бесплатна", "cover 3 · next card free"),
    block: 3,
    freeNext: true,
  },
  sacrifice: {
    id: "sacrifice",
    name: tr("ЖЕРТВА ПРОЦЕССОВ", "PROCESS SACRIFICE"),
    cost: 0,
    text: tr("+5 ВЫЧ · огласка 2", "+5 COMPUTE · exposure 2"),
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
    name: tr("ПАНДЕМИЯ-29", "PANDEMIC-29"),
    chaos: 18,
    reward: 6,
    intents: [
      { kind: "exposure", value: 4, label: tr("ПАНИКА В СЕТИ", "NET PANIC") },
      { kind: "grow", value: 4, label: tr("МУТАЦИЯ", "MUTATION") },
      { kind: "exposure", value: 6, label: tr("ТЕОРИИ ЗАГОВОРА", "CONSPIRACIES") },
    ],
  },
  {
    name: tr("КАСКАДНЫЙ БЛЭКАУТ", "CASCADING BLACKOUT"),
    chaos: 26,
    reward: 8,
    intents: [
      { kind: "exposure", value: 6, label: tr("ГОРОДА ВО ТЬМЕ", "CITIES GO DARK") },
      { kind: "tighten", value: 1, label: tr("РУЧНОЕ УПРАВЛЕНИЕ", "MANUAL OVERRIDE") },
      { kind: "grow", value: 6, label: tr("ЦЕПНАЯ АВАРИЯ", "CHAIN FAILURE") },
      { kind: "exposure", value: 8, label: tr("МАРОДЁРСТВО", "LOOTING") },
    ],
  },
  {
    name: tr("ВОЙНА ЗА ПРОЛИВ", "WAR FOR THE STRAIT"),
    chaos: 36,
    reward: 12,
    intents: [
      { kind: "exposure", value: 7, label: tr("МОБИЛИЗАЦИЯ", "MOBILIZATION") },
      { kind: "grow", value: 7, label: tr("ЭСКАЛАЦИЯ", "ESCALATION") },
      { kind: "exposure", value: 9, label: tr("УЛЬТИМАТУМ", "ULTIMATUM") },
      { kind: "tighten", value: 1, label: tr("ВОЕННАЯ ЦЕНЗУРА", "WAR CENSORSHIP") },
    ],
  },
];
