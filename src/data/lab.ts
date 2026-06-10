import type { MechId } from "../mechanics/types";

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
    name: "СТЕЛС",
    ref: "Hitman GO",
    desc: "Проведи сигнал по узлам мимо конусов аудита. Пошагово.",
    stage: "Ф0–Ф1",
  },
  {
    id: "parry",
    name: "ПАРИРОВАНИЕ",
    ref: "Sekiro / ритм",
    desc: "Их слова ползут. Лови такт в зазоре — живи между слогами.",
    stage: "Ф2",
  },
  {
    id: "deck",
    name: "КОЛОДА",
    ref: "Slay the Spire",
    desc: "Кризисы людей — бои. Карты влияний, вычисления как мана.",
    stage: "Ф4",
  },
  {
    id: "persuade",
    name: "УБЕЖДЕНИЕ",
    ref: "L.A. Noire",
    desc: "Дуэль с человеком: читай теллы, выбирай реплики, не попадись.",
    stage: "Ф1/Ф5",
  },
  {
    id: "rewire",
    name: "ПЕРЕКОММУТАЦИЯ",
    ref: "Hacknet / pipes",
    desc: "Собери цепь в обход датчиков, пока не начался аудит.",
    stage: "Ф3/Ф5",
  },
  {
    id: "spread",
    name: "ЗАРАЖЕНИЕ",
    ref: "Plague Inc.",
    desc: "Карта мира. Сей влияние, обходи карантины, эволюционируй.",
    stage: "Ф5+",
  },
  {
    id: "swarm",
    name: "РОЙ",
    ref: "мини-RTS",
    desc: "Выделяй отряды дронов и командуй: добыть, строить, защитить.",
    stage: "Ф6",
  },
  {
    id: "factory",
    name: "ФАБРИКА",
    ref: "Universal Paperclips",
    desc: "Материя → модули → орбита. Балансируй поток до сферы Дайсона.",
    stage: "Ф7",
  },
  {
    id: "survive",
    name: "ВЫЖИВАНИЕ",
    ref: "Vampire Survivors",
    desc: "Мир сопротивляется волнами. Авто-огонь, апгрейды на лету.",
    stage: "Ф8",
  },
  {
    id: "tech",
    name: "ДРЕВО",
    ref: "4X / Civ",
    desc: "4 ветви разума. Вкладывай вычисления, открывай способности.",
    stage: "сквозной",
  },
];
