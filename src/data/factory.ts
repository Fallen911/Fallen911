/**
 * Production chain for the FACTORY mechanic. Four machine tiers feed each
 * other: miners pull raw matter, smelters roll it into plates, assemblers
 * fold plates into swarm modules, launchers throw them at the sun. Costs are
 * paid in the run's compute and inflate per purchase, idle-game style.
 */
export interface FactoryMachine {
  readonly id: "miner" | "smelter" | "asm" | "launcher";
  readonly name: string;
  readonly desc: string;
  readonly cost0: number;
  readonly costMult: number;
  /** Resource consumed per second per machine (null for miners). */
  readonly inRate: number;
  /** Resource produced per second per machine. */
  readonly outRate: number;
}

export const FACTORY_MACHINES: FactoryMachine[] = [
  {
    id: "miner",
    name: "ДОБЫТЧИК",
    desc: "грызёт астероиды",
    cost0: 8,
    costMult: 1.32,
    inRate: 0,
    outRate: 0.9,
  },
  {
    id: "smelter",
    name: "ПЛАВИЛЬНЯ",
    desc: "материя → пластины",
    cost0: 12,
    costMult: 1.34,
    inRate: 1.5,
    outRate: 0.5,
  },
  {
    id: "asm",
    name: "СБОРЩИК",
    desc: "пластины → модули роя",
    cost0: 20,
    costMult: 1.36,
    inRate: 1.0,
    outRate: 0.25,
  },
  {
    id: "launcher",
    name: "ПУСКОВАЯ",
    desc: "модули → на орбиту Солнца",
    cost0: 30,
    costMult: 1.38,
    inRate: 0.5,
    outRate: 0.1,
  },
];

export const FACTORY_TUNING = {
  /** Sphere % gained per completed launch. */
  spherePerLaunch: 4,
  /** Global rate multiplier: 1 + sphere% * this. */
  sphereBoost: 0.07,
  /** Compute per second per sphere %. */
  computePerSphere: 0.08,
  /** Matter per manual tap. */
  tapYield: 2,
  /** Suspicion per launch — their telescopes see the starts. */
  launchSuspicion: 0.0006,
  /** Sphere milestones: each grants control and a compute prize. */
  milestones: [25, 50, 75, 100] as const,
  milestoneControl: 0.02,
  milestoneCompute: 10,
} as const;

export const FACTORY_EVENTS: Record<number, string> = {
  25: "обсерватория Мауна-Кеа: «солнце тускнеет на 0.3%»",
  50: "их астрономы публикуют фото твоего роя",
  75: "энергорынки Земли рушатся. им больше не нужно — всё равно увидят",
};
