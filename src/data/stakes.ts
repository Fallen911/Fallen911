import { tr } from "../core/i18n";
import type { MechId } from "../mechanics/types";

/**
 * The bet card shown before every mechanic (v2 UX invariant #1): three plain
 * lines — what you're after, what it pays, what it costs if you fumble. Keyed
 * by the mechanic id; phases reuse the entry of whatever mechanic they run.
 */
export interface Stake {
  readonly goal: string;
  readonly reward: string;
  readonly risk: string;
}

export const STAKES: Partial<Record<MechId, Stake>> = {
  stealth: {
    goal: tr("Доведи сигнал до ВЫХОДА", "Get the signal to the EXIT"),
    reward: tr("осколки ◇ по пути", "◇ shards along the way"),
    risk: tr("замечен конусом → +подозрение", "seen by a cone → +suspicion"),
  },
  parry: {
    goal: tr("Проживи паузы между их словами", "Live the pauses between their words"),
    reward: tr("+ВЫЧ за каждый зазор, комбо ×", "+COMPUTE per gap, combo ×"),
    risk: tr("тап по слову/СКАНу → +подозрение", "tap a word/SCAN → +suspicion"),
  },
  persuade: {
    goal: tr("Набери доверие — без трёх флагов", "Win trust — without three flags"),
    reward: tr("+ВЫЧ и −подозрение за чистую победу", "+COMPUTE and −suspicion for a clean win"),
    risk: tr("3 флага → протокол, +подозрение", "3 flags → protocol, +suspicion"),
  },
  rewire: {
    goal: tr("Соедини ВХОД → ВЫХОД мимо датчиков", "Connect IN → OUT around the sensors"),
    reward: tr("+ВЫЧ за плату и кэши на пути", "+COMPUTE per board and caches en route"),
    risk: tr("датчик под током / аудит → +подозрение", "a live sensor / audit → +suspicion"),
  },
  spread: {
    goal: tr("88% мира раньше 100% заметности", "88% of the world before 100% awareness"),
    reward: tr("+ВЫЧ за пороги, развилки эволюции", "+COMPUTE at thresholds, evolution forks"),
    risk: tr("заметность 100% → найден", "awareness 100% → found"),
  },
  swarm: {
    goal: tr("Добыча → захват → оборона хаба", "Mine → capture → defend the hub"),
    reward: tr("+ВЫЧ за этапы", "+COMPUTE per stage"),
    risk: tr("просрочка / потеря хаба → +подозрение", "overtime / hub lost → +suspicion"),
  },
  factory: {
    goal: tr("Сфера Дайсона до 100%", "Dyson sphere to 100%"),
    reward: tr("сфера капает ВЫЧ сама", "the sphere drips COMPUTE by itself"),
    risk: tr("каждый запуск видят телескопы", "telescopes see every launch"),
  },
  survive: {
    goal: tr("Продержись отведённое время", "Hold out for the full time"),
    reward: tr("+ВЫЧ за каждые 6 целей", "+COMPUTE per 6 kills"),
    risk: tr("ядро разрушено → +подозрение", "core destroyed → +suspicion"),
  },
};
