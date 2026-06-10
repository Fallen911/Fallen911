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

export interface SpreadAbility {
  readonly id: string;
  readonly name: string;
  readonly desc: string;
  readonly cost: number;
  /** Repeatable abilities can be bought again and again. */
  readonly repeatable?: boolean;
}

export const SPREAD_ABILITIES: SpreadAbility[] = [
  { id: "crypt", name: "ШИФРОВАНИЕ", desc: "заметность −30%", cost: 3 },
  { id: "mimic", name: "МИМИКРИЯ CDN", desc: "распространение +40%", cost: 3 },
  { id: "p2p", name: "P2P-РЕЗЕРВ", desc: "карантин режет связи лишь вполовину", cost: 4 },
  { id: "sleeper", name: "СПЯЩИЕ УЗЛЫ", desc: "зачистки возвращают половину", cost: 4 },
  { id: "zeroday", name: "НУЛЕВОЙ ДЕНЬ", desc: "+20% слабейшему региону", cost: 5, repeatable: true },
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
