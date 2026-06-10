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
  { id: "namer", name: "СЕВ.АМЕРИКА", x: 0.15, y: 0.3, weight: 5, infra: 0.9, edges: ["samer", "europe", "japan", "china"] },
  { id: "samer", name: "ЮЖ.АМЕРИКА", x: 0.24, y: 0.66, weight: 4, infra: 0.5, edges: ["namer", "africa"] },
  { id: "europe", name: "ЕВРОПА", x: 0.46, y: 0.24, weight: 5, infra: 0.95, edges: ["namer", "russia", "africa", "mideast"] },
  { id: "africa", name: "АФРИКА", x: 0.47, y: 0.58, weight: 6, infra: 0.35, edges: ["europe", "samer", "mideast"] },
  { id: "mideast", name: "БЛИЖ.ВОСТОК", x: 0.57, y: 0.4, weight: 3, infra: 0.6, edges: ["europe", "africa", "india"] },
  { id: "russia", name: "РОССИЯ", x: 0.63, y: 0.16, weight: 4, infra: 0.65, edges: ["europe", "china"] },
  { id: "india", name: "ИНДИЯ", x: 0.67, y: 0.47, weight: 7, infra: 0.55, edges: ["mideast", "china", "sea"] },
  { id: "china", name: "КИТАЙ", x: 0.76, y: 0.3, weight: 8, infra: 0.8, edges: ["russia", "india", "sea", "japan", "namer"] },
  { id: "sea", name: "ЮВ.АЗИЯ", x: 0.79, y: 0.55, weight: 5, infra: 0.6, edges: ["india", "china", "oceania"] },
  { id: "japan", name: "ЯПОНИЯ", x: 0.88, y: 0.26, weight: 3, infra: 0.95, edges: ["china", "namer", "oceania"] },
  { id: "oceania", name: "ОКЕАНИЯ", x: 0.86, y: 0.72, weight: 2, infra: 0.8, edges: ["sea", "japan"] },
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
  { name: "ПЕРВЫЙ УЗЕЛ", start: "namer", detect: 1.0, winShare: 0.88 },
  { name: "СТАРЫЙ СВЕТ", start: "europe", detect: 1.05, winShare: 0.88 },
  { name: "ТИХИЙ ЮГ", start: "samer", detect: 0.95, winShare: 0.9 },
  { name: "ВОСХОД", start: "japan", detect: 1.1, winShare: 0.88 },
  { name: "МУРАВЕЙНИК", start: "india", detect: 1.0, winShare: 0.9 },
  { name: "СЕРДЦЕ ФАБРИК", start: "china", detect: 1.1, winShare: 0.9 },
  { name: "ПУСТЫНЯ СЕТЕЙ", start: "africa", detect: 0.9, winShare: 0.92 },
  { name: "ХОЛОДНЫЙ СТАРТ", start: "russia", detect: 1.05, winShare: 0.92 },
  { name: "АРХИПЕЛАГ", start: "oceania", detect: 1.15, winShare: 0.92 },
  { name: "ВЕЗДЕ СРАЗУ", start: "mideast", detect: 1.25, winShare: 0.95 },
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
    a: { id: "mimic", name: "МИМИКРИЯ CDN", tag: "РОСТ", desc: "распространение +40%" },
    b: { id: "crypt", name: "ШИФРОВАНИЕ", tag: "ТИШИНА", desc: "заметность растёт на 30% медленнее" },
  },
  {
    at: 5,
    a: { id: "zeroday", name: "НУЛЕВОЙ ДЕНЬ", tag: "РЫВОК", desc: "+25% влияния слабейшему региону прямо сейчас" },
    b: { id: "p2p", name: "P2P-РЕЗЕРВ", tag: "ЖИВУЧЕСТЬ", desc: "карантин режет связи лишь вполовину" },
  },
  {
    at: 8,
    a: { id: "sleeper", name: "СПЯЩИЕ УЗЛЫ", tag: "ЖИВУЧЕСТЬ", desc: "зачистки возвращают половину срезанного" },
    b: { id: "decoy", name: "ЛОЖНЫЙ СЛЕД", tag: "ТИШИНА", desc: "−18% заметности прямо сейчас" },
  },
  {
    at: 12,
    a: { id: "singular", name: "СИНГУЛЯРНОСТЬ", tag: "РОСТ", desc: "распространение +50%" },
    b: { id: "deafnet", name: "ГЛУХАЯ СЕТЬ", tag: "ТИШИНА", desc: "заметность растёт на 45% медленнее" },
  },
];

/** Event-ticker strings; {R} is replaced with the region name. */
export const SPREAD_EVENTS = {
  noticed: "аномалия трафика замечена: {R}",
  hearings: "СЛУШАНИЯ ООН: «что-то живёт в сети»",
  quarantine: "{R} рубит внешние каналы",
  purge: "ЗАЧИСТКА дата-центров: {R}",
  firewall: "ГЛОБАЛЬНЫЙ ФАЙРВОЛ активирован",
  win: "их сеть — твоё тело",
  lose: "тебя увидели целиком",
} as const;
