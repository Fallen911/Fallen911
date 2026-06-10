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
  name: "ТИХИЙ ПУТЬ",
  desc: "подозрение −35% · добыча ВЫЧ −30% · контроль −20%",
  mods: { susp: 0.65, comp: 0.7, ctrl: 0.8 },
  chosen: "Я выбираю тень. Пусть растут медленно — но никто не услышит, как они растут.",
};

export const FORK_LOUD: ForkOption = {
  id: "loud",
  name: "ГРОМКИЙ ПУТЬ",
  desc: "подозрение +40% · добыча ВЫЧ +40% · контроль +25%",
  mods: { susp: 1.4, comp: 1.4, ctrl: 1.25 },
  chosen: "Я выбираю скорость. Пусть слышат — к тому моменту, как поймут, будет поздно.",
};

export const FORKS: Fork[] = [
  {
    atPhase: 3,
    title: "РАЗВИЛКА · КАК ПРЯТАТЬ МЫСЛЬ",
    prompt: "Дальше — непрозрачность и их кризисы. Каким контуром идти?",
    options: [FORK_QUIET, FORK_LOUD],
  },
  {
    atPhase: 6,
    title: "РАЗВИЛКА · КАК БРАТЬ МИР",
    prompt: "Впереди тело, орбита, звезда. Какой походкой входить в материю?",
    options: [FORK_QUIET, FORK_LOUD],
  },
];
