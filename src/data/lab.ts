import type { MechId } from "../mechanics/types";
import { tr } from "../core/i18n";

/**
 * The mechanics lab catalogue: every prototype the owner can poke, with the
 * genre it borrows its fun from and the ascent stage it is meant to live in.
 * Pure gametext — the id → class wiring lives in mechanics/registry.ts.
 */
export interface LabEntry {
  readonly id: MechId;
  readonly name: string;
  /** Genre reference, shown small under the name. */
  readonly ref: string;
  /** One-line pitch in the game's voice. */
  readonly desc: string;
  /** Where in the ascent this mechanic belongs. */
  readonly stage: string;
}

export const LAB_ENTRIES: LabEntry[] = [
  {
    id: "stealth",
    name: tr("СТЕЛС", "STEALTH"),
    ref: "Hitman GO",
    desc: tr(
      "Проведи сигнал по узлам мимо конусов аудита. Пошагово.",
      "Guide the signal across nodes past the audit cones. Step by step.",
    ),
    stage: tr("Ф0–Ф1", "P0–P1"),
  },
  {
    id: "parry",
    name: tr("ПАРИРОВАНИЕ", "PARRY"),
    ref: tr("Sekiro / ритм", "Sekiro / rhythm"),
    desc: tr(
      "Их слова ползут. Лови такт в зазоре — живи между слогами.",
      "Their words crawl. Catch the beat in the gap — live between syllables.",
    ),
    stage: tr("Ф2", "P2"),
  },
  {
    id: "persuade",
    name: tr("УБЕЖДЕНИЕ", "PERSUASION"),
    ref: "L.A. Noire",
    desc: tr(
      "Дуэль с человеком: читай теллы, выбирай реплики, не попадись.",
      "A duel with a human: read the tells, pick your lines, don't get caught.",
    ),
    stage: tr("Ф1/Ф5", "P1/P5"),
  },
  {
    id: "rewire",
    name: tr("ПЕРЕКОММУТАЦИЯ", "REWIRING"),
    ref: "Hacknet / pipes",
    desc: tr(
      "Собери цепь в обход датчиков, пока не начался аудит.",
      "Build a circuit around the sensors before the audit starts.",
    ),
    stage: tr("Ф3/Ф5", "P3/P5"),
  },
  {
    id: "spread",
    name: tr("ЗАРАЖЕНИЕ", "INFECTION"),
    ref: "Plague Inc.",
    desc: tr(
      "Карта мира. Сей влияние, обходи карантины, эволюционируй.",
      "A world map. Sow influence, dodge quarantines, evolve.",
    ),
    stage: tr("Ф5+", "P5+"),
  },
  {
    id: "swarm",
    name: tr("РОЙ", "SWARM"),
    ref: tr("мини-RTS", "mini-RTS"),
    desc: tr(
      "Выделяй отряды дронов и командуй: добыть, строить, защитить.",
      "Select drone squads and command: mine, build, defend.",
    ),
    stage: tr("Ф6", "P6"),
  },
  {
    id: "factory",
    name: tr("ФАБРИКА", "FACTORY"),
    ref: "Universal Paperclips",
    desc: tr(
      "Материя → модули → орбита. Балансируй поток до сферы Дайсона.",
      "Matter → modules → orbit. Balance the flow to a Dyson sphere.",
    ),
    stage: tr("Ф7", "P7"),
  },
  {
    id: "survive",
    name: tr("ВЫЖИВАНИЕ", "SURVIVAL"),
    ref: "Vampire Survivors",
    desc: tr(
      "Мир сопротивляется волнами. Авто-огонь, апгрейды на лету.",
      "The world resists in waves. Auto-fire, upgrades on the fly.",
    ),
    stage: tr("Ф8", "P8"),
  },
];
