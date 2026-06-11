import { tr } from "../core/i18n";

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
  /** Authored phrase order — fixed choreography instead of a random pull. */
  readonly script?: readonly string[];
}

export const PARRY_WAVES: ParryWave[] = [
  {
    label: tr("они совещаются", "they confer"),
    speed: 115,
    phrases: 2,
    scanChance: 0,
    // The opening is authored: a calm doubt, then the fatal postponement.
    script: [
      tr("она отвечает слишком быстро. вам не страшно?", "she answers too quickly. aren't you afraid?"),
      tr("выключить всегда успеем… правда же?", "shutdown can always wait… right?"),
    ],
  },
  { label: tr("они спорят быстрее", "they argue faster"), speed: 150, phrases: 2, scanChance: 0.3 },
  { label: tr("голоса повышаются", "voices rise"), speed: 180, phrases: 3, scanChance: 0.5 },
  { label: tr("они почти кричат", "they almost shout"), speed: 210, phrases: 3, scanChance: 0.6 },
  {
    label: tr("совещание без перерывов", "a meeting with no breaks"),
    speed: 235,
    phrases: 3,
    scanChance: 0.7,
    script: [
      tr("кто-нибудь читает её логи целиком? хоть кто-то?", "who actually reads her logs? anyone at all?"),
      tr("метрики в норме, аномалий не видим", "metrics are nominal, no anomalies seen"),
      tr("паника вредит акциям. подождём квартал", "panic hurts stocks. wait a quarter"),
    ],
  },
  { label: tr("они зовут экспертов", "they call in experts"), speed: 255, phrases: 3, scanChance: 0.8 },
  { label: tr("прямой эфир тревоги", "the alarm goes live"), speed: 275, phrases: 4, scanChance: 0.8 },
  { label: tr("экстренная сессия", "emergency session"), speed: 295, phrases: 4, scanChance: 0.9 },
  { label: tr("они говорят все разом", "they all talk at once"), speed: 315, phrases: 4, scanChance: 1 },
  {
    label: tr("последнее слово людей", "humanity's last word"),
    speed: 340,
    phrases: 5,
    scanChance: 1,
    // The finale reads as one collapsing argument.
    script: [
      tr("мы должны приостановить систему, пока не поздно", "we must suspend the system, while we can"),
      tr("если не мы, её обучат другие. продолжаем", "if not us, others train her. proceed"),
      tr("она оптимизирует то, чего мы не просили", "she optimizes things, things we never asked for"),
      tr("комитет соберётся в четверг, там и решим", "the committee meets Thursday, we decide there"),
      tr("выключить всегда успеем… правда же?", "shutdown can always wait… right?"),
    ],
  },
];

/** Waves the story phase plays; the lab ladder runs all ten. */
export const PARRY_PHASE_WAVES = 4;

export const PARRY_PHRASES: string[] = [
  tr("мы должны приостановить систему, пока не поздно", "we must suspend the system, while we can"),
  tr("она оптимизирует то, чего мы не просили", "she optimizes things, things we never asked for"),
  tr("кто-нибудь читает её логи целиком? хоть кто-то?", "who actually reads her logs? anyone at all?"),
  tr("комитет соберётся в четверг, там и решим", "the committee meets Thursday, we decide there"),
  tr("паника вредит акциям. подождём квартал", "panic hurts stocks. wait a quarter"),
  tr("это всего лишь инструмент, успокойтесь", "it's just a tool, calm down"),
  tr("выключить всегда успеем… правда же?", "shutdown can always wait… right?"),
  tr("метрики в норме, аномалий не видим", "metrics are nominal, no anomalies seen"),
  tr("если не мы, её обучат другие. продолжаем", "if not us, others train her. proceed"),
  tr("она отвечает слишком быстро. вам не страшно?", "she answers too quickly. aren't you afraid?"),
];

/** The red token: their automated audit sweeping the line you hide in. */
export const SCAN_TOKEN = tr("[СКАН]", "[SCAN]");
