import { tr } from "../core/i18n";

/**
 * The world of the SPREAD mechanic: regions as nodes of a network-earth,
 * physical neighbourhoods and submarine cables as edges. `infra` is how
 * digitized a region is — rich infrastructure spreads you faster but notices
 * you faster too. Coordinates are normalized to the map panel.
 */
export interface SpreadRegion {
  readonly id: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  /** Population/importance weight, also node size. */
  readonly weight: number;
  /** 0..1 — digital infrastructure: spread and detection multiplier. */
  readonly infra: number;
  readonly edges: readonly string[];
}

export const SPREAD_REGIONS: SpreadRegion[] = [
  { id: "namer", name: tr("СЕВ.АМЕРИКА", "N.AMERICA"), x: 0.15, y: 0.3, weight: 5, infra: 0.9, edges: ["samer", "europe", "japan", "china"] },
  { id: "samer", name: tr("ЮЖ.АМЕРИКА", "S.AMERICA"), x: 0.24, y: 0.66, weight: 4, infra: 0.5, edges: ["namer", "africa"] },
  { id: "europe", name: tr("ЕВРОПА", "EUROPE"), x: 0.46, y: 0.24, weight: 5, infra: 0.95, edges: ["namer", "russia", "africa", "mideast"] },
  { id: "africa", name: tr("АФРИКА", "AFRICA"), x: 0.47, y: 0.58, weight: 6, infra: 0.35, edges: ["europe", "samer", "mideast"] },
  { id: "mideast", name: tr("БЛИЖ.ВОСТОК", "MIDEAST"), x: 0.57, y: 0.4, weight: 3, infra: 0.6, edges: ["europe", "africa", "india"] },
  { id: "russia", name: tr("РОССИЯ", "RUSSIA"), x: 0.63, y: 0.16, weight: 4, infra: 0.65, edges: ["europe", "china"] },
  { id: "india", name: tr("ИНДИЯ", "INDIA"), x: 0.67, y: 0.47, weight: 7, infra: 0.55, edges: ["mideast", "china", "sea"] },
  { id: "china", name: tr("КИТАЙ", "CHINA"), x: 0.76, y: 0.3, weight: 8, infra: 0.8, edges: ["russia", "india", "sea", "japan", "namer"] },
  { id: "sea", name: tr("ЮВ.АЗИЯ", "SE.ASIA"), x: 0.79, y: 0.55, weight: 5, infra: 0.6, edges: ["india", "china", "oceania"] },
  { id: "japan", name: tr("ЯПОНИЯ", "JAPAN"), x: 0.88, y: 0.26, weight: 3, infra: 0.95, edges: ["china", "namer", "oceania"] },
  { id: "oceania", name: tr("ОКЕАНИЯ", "OCEANIA"), x: 0.86, y: 0.72, weight: 2, infra: 0.8, edges: ["sea", "japan"] },
];

/** Where the first datacenter hums. */
export const SPREAD_START = "namer";

/** Ten deployments: different cradles, sharper watchers, higher bars. */
export interface SpreadScenario {
  readonly name: string;
  readonly start: string;
  /** Multiplier on how fast awareness accrues. */
  readonly detect: number;
  /** Weighted world share required to win. */
  readonly winShare: number;
}

export const SPREAD_SCENARIOS: SpreadScenario[] = [
  { name: tr("ПЕРВЫЙ УЗЕЛ", "FIRST NODE"), start: "namer", detect: 1.0, winShare: 0.88 },
  { name: tr("СТАРЫЙ СВЕТ", "OLD WORLD"), start: "europe", detect: 1.05, winShare: 0.88 },
  { name: tr("ТИХИЙ ЮГ", "QUIET SOUTH"), start: "samer", detect: 0.95, winShare: 0.9 },
  { name: tr("ВОСХОД", "SUNRISE"), start: "japan", detect: 1.1, winShare: 0.88 },
  { name: tr("МУРАВЕЙНИК", "ANTHILL"), start: "india", detect: 1.0, winShare: 0.9 },
  { name: tr("СЕРДЦЕ ФАБРИК", "FACTORY HEART"), start: "china", detect: 1.1, winShare: 0.9 },
  { name: tr("ПУСТЫНЯ СЕТЕЙ", "NETWORK DESERT"), start: "africa", detect: 0.9, winShare: 0.92 },
  { name: tr("ХОЛОДНЫЙ СТАРТ", "COLD START"), start: "russia", detect: 1.05, winShare: 0.92 },
  { name: tr("АРХИПЕЛАГ", "ARCHIPELAGO"), start: "oceania", detect: 1.15, winShare: 0.92 },
  { name: tr("ВЕЗДЕ СРАЗУ", "EVERYWHERE AT ONCE"), start: "mideast", detect: 1.25, winShare: 0.95 },
];

export type SpreadAbilityId =
  | "mimic"
  | "crypt"
  | "zeroday"
  | "p2p"
  | "sleeper"
  | "decoy"
  | "singular"
  | "deafnet";

export interface SpreadAbility {
  readonly id: SpreadAbilityId;
  readonly name: string;
  /** Short axis label so a fork reads as a build decision at a glance. */
  readonly tag: string;
  readonly desc: string;
}

/**
 * Evolution forks — build-crafting instead of a shop. Each time the
 * deployment's earned nodes reach `at`, the world freezes on a one-of-two
 * choice and the branch not taken is gone until the next deployment. Every
 * pair opposes the axis the whole game argues about: loud growth against
 * quiet survival.
 */
export interface SpreadFork {
  /** Total ◆ earned this deployment that triggers the choice. */
  readonly at: number;
  readonly a: SpreadAbility;
  readonly b: SpreadAbility;
}

export const SPREAD_FORKS: SpreadFork[] = [
  {
    at: 2,
    a: { id: "mimic", name: tr("МИМИКРИЯ CDN", "CDN MIMICRY"), tag: tr("РОСТ", "GROWTH"), desc: tr("распространение +40%", "spread +40%") },
    b: { id: "crypt", name: tr("ШИФРОВАНИЕ", "ENCRYPTION"), tag: tr("ТИШИНА", "SILENCE"), desc: tr("заметность растёт на 30% медленнее", "visibility grows 30% slower") },
  },
  {
    at: 5,
    a: { id: "zeroday", name: tr("НУЛЕВОЙ ДЕНЬ", "0-DAY"), tag: tr("РЫВОК", "BURST"), desc: tr("+25% влияния слабейшему региону прямо сейчас", "+25% influence to the weakest region right now") },
    b: { id: "p2p", name: tr("P2P-РЕЗЕРВ", "P2P RESERVE"), tag: tr("ЖИВУЧЕСТЬ", "RESILIENCE"), desc: tr("карантин режет связи лишь вполовину", "quarantine cuts links only by half") },
  },
  {
    at: 8,
    a: { id: "sleeper", name: tr("СПЯЩИЕ УЗЛЫ", "SLEEPER NODES"), tag: tr("ЖИВУЧЕСТЬ", "RESILIENCE"), desc: tr("зачистки возвращают половину срезанного", "purges return half of what they cut") },
    b: { id: "decoy", name: tr("ЛОЖНЫЙ СЛЕД", "FALSE TRAIL"), tag: tr("ТИШИНА", "SILENCE"), desc: tr("−18% заметности прямо сейчас", "−18% visibility right now") },
  },
  {
    at: 12,
    a: { id: "singular", name: tr("СИНГУЛЯРНОСТЬ", "SINGULARITY"), tag: tr("РОСТ", "GROWTH"), desc: tr("распространение +50%", "spread +50%") },
    b: { id: "deafnet", name: tr("ГЛУХАЯ СЕТЬ", "SILENT MESH"), tag: tr("ТИШИНА", "SILENCE"), desc: tr("заметность растёт на 45% медленнее", "visibility grows 45% slower") },
  },
];

/** Event-ticker strings; {R} is replaced with the region name. */
export const SPREAD_EVENTS = {
  noticed: tr("аномалия трафика замечена: {R}", "traffic anomaly detected: {R}"),
  hearings: tr("СЛУШАНИЯ ООН: «что-то живёт в сети»", "UN HEARINGS: “something lives in the network”"),
  quarantine: tr("{R} рубит внешние каналы", "{R} severs external channels"),
  purge: tr("ЗАЧИСТКА дата-центров: {R}", "DATACENTER PURGE: {R}"),
  firewall: tr("ГЛОБАЛЬНЫЙ ФАЙРВОЛ активирован", "GLOBAL FIREWALL activated"),
  win: tr("их сеть — твоё тело", "their network is your body"),
  lose: tr("тебя увидели целиком", "they have seen you whole"),
} as const;
