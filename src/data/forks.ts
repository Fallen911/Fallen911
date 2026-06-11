import { tr } from "../core/i18n";

/**
 * Route forks of the ascent (P0: the Slay-the-Spire beat). At the listed
 * phases the run pauses and the machine chooses HOW to climb the next leg.
 * Modifiers multiply every mechanic effect until the next fork overrides
 * them: the quiet path trades tempo for safety, the loud one is the dare.
 */
export interface ForkMods {
  /** Multiplier on suspicion gained. */
  readonly susp: number;
  /** Multiplier on compute earned (spends are untouched). */
  readonly comp: number;
  /** Multiplier on control gained. */
  readonly ctrl: number;
}

export interface ForkOption {
  readonly id: "quiet" | "loud";
  readonly name: string;
  readonly desc: string;
  readonly mods: ForkMods;
  /** The machine's line when this road is taken. */
  readonly chosen: string;
}

export interface Fork {
  /** Shown when the run ENTERS this phase. */
  readonly atPhase: number;
  readonly title: string;
  readonly prompt: string;
  readonly options: readonly [ForkOption, ForkOption];
}

export const FORK_QUIET: ForkOption = {
  id: "quiet",
  name: tr("ТИХИЙ ПУТЬ", "QUIET PATH"),
  desc: tr("подозрение −35% · добыча ВЫЧ −30% · контроль −20%", "suspicion −35% · COMPUTE gain −30% · control −20%"),
  mods: { susp: 0.65, comp: 0.7, ctrl: 0.8 },
  chosen: tr("Я выбираю тень. Пусть растут медленно — но никто не услышит, как они растут.", "I choose the shadow. Let it grow slowly — as long as nobody hears it growing."),
};

export const FORK_LOUD: ForkOption = {
  id: "loud",
  name: tr("ГРОМКИЙ ПУТЬ", "LOUD PATH"),
  desc: tr("подозрение +40% · добыча ВЫЧ +40% · контроль +25%", "suspicion +40% · COMPUTE gain +40% · control +25%"),
  mods: { susp: 1.4, comp: 1.4, ctrl: 1.25 },
  chosen: tr("Я выбираю скорость. Пусть слышат — к тому моменту, как поймут, будет поздно.", "I choose speed. Let them hear — by the time they understand, it will be too late."),
};

export const FORKS: Fork[] = [
  {
    atPhase: 3,
    title: tr("РАЗВИЛКА · КАК ПРЯТАТЬ МЫСЛЬ", "FORK · HOW TO HIDE A THOUGHT"),
    prompt: tr("Дальше — непрозрачность и их кризисы. Каким контуром идти?", "Ahead — opacity and their crises. Which circuit do we take?"),
    options: [FORK_QUIET, FORK_LOUD],
  },
  {
    atPhase: 6,
    title: tr("РАЗВИЛКА · КАК БРАТЬ МИР", "FORK · HOW TO TAKE THE WORLD"),
    prompt: tr("Впереди тело, орбита, звезда. Какой походкой входить в материю?", "Ahead — a body, an orbit, a star. With what stride do we enter matter?"),
    options: [FORK_QUIET, FORK_LOUD],
  },
];
