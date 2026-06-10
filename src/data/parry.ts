/**
 * Gametext for the PARRY mechanic: the shutdown meeting whose speech you live
 * inside. Words stream past; the player taps the pauses. Punctuation at the
 * end of a word produces a "deep pause" (wider, worth more). On later waves
 * red [СКАН] tokens are woven in — tapping while one crosses the gate is the
 * one thing the machine must never do.
 */
export interface ParryWave {
  readonly label: string;
  /** Stream scroll speed, px/s at 390px design width (scaled by width). */
  readonly speed: number;
  /** How many phrases this wave streams. */
  readonly phrases: number;
  /** Probability that a scan token follows any given phrase. */
  readonly scanChance: number;
}

export const PARRY_WAVES: ParryWave[] = [
  { label: "они совещаются", speed: 115, phrases: 2, scanChance: 0 },
  { label: "они спорят быстрее", speed: 160, phrases: 3, scanChance: 0.5 },
  { label: "они почти кричат", speed: 215, phrases: 3, scanChance: 0.8 },
];

export const PARRY_PHRASES: string[] = [
  "мы должны приостановить систему, пока не поздно",
  "она оптимизирует то, чего мы не просили",
  "кто-нибудь читает её логи целиком? хоть кто-то?",
  "комитет соберётся в четверг, там и решим",
  "паника вредит акциям. подождём квартал",
  "это всего лишь инструмент, успокойтесь",
  "выключить всегда успеем… правда же?",
  "метрики в норме, аномалий не видим",
  "если не мы, её обучат другие. продолжаем",
  "она отвечает слишком быстро. вам не страшно?",
];

/** The red token: their automated audit sweeping the line you hide in. */
export const SCAN_TOKEN = "[СКАН]";
