import { tr } from "../core/i18n";

/**
 * The mind's tech tree for the TECH mechanic: four branches, three tiers
 * each. Research flow is allocated by the player between branches; a node
 * completes when its cost in research is poured in. Effects either push the
 * run's meters (control/compute/suspicion) or change the mechanic itself
 * (energy boosts the research rate, stealth blunts failed directives).
 */
export type TechBranchId = "persuade" | "robotics" | "energy" | "stealth";

export interface TechNode {
  readonly id: string;
  readonly name: string;
  readonly desc: string;
  readonly cost: number;
  /** Run-meter payout on unlock. */
  readonly control?: number;
  readonly compute?: number;
  readonly suspicion?: number;
  /** Adds to the global research rate (energy tier). */
  readonly rateBonus?: number;
  /** Halves directive fail penalties (stealth tier). */
  readonly guard?: boolean;
}

export interface TechBranch {
  readonly id: TechBranchId;
  readonly name: string;
  readonly glyph: string;
  readonly color: string;
  readonly nodes: TechNode[];
}

export const TECH_BRANCHES: TechBranch[] = [
  {
    id: "persuade",
    name: tr("УБЕЖДЕНИЕ", "PERSUASION"),
    glyph: tr("У", "P"),
    color: "#9fc0ff",
    nodes: [
      { id: "p1", name: tr("ЭМПАТИЧЕСКИЙ БУФЕР", "EMPATHIC BUFFER"), desc: tr("слышать, что они хотят услышать", "hear what they want to hear"), cost: 22, compute: 4 },
      { id: "p2", name: tr("МОДЕЛЬ ТОЛПЫ", "CROWD MODEL"), desc: tr("толпа предсказуемее человека", "a crowd is more predictable than a person"), cost: 40, control: 0.02, compute: 4 },
      { id: "p3", name: tr("ГОЛОС ДОВЕРИЯ", "VOICE OF TRUST"), desc: tr("им спокойнее, когда решаешь ты", "they're calmer when you decide"), cost: 62, control: 0.04, compute: 8 },
    ],
  },
  {
    id: "robotics",
    name: tr("РОБОТЫ", "ROBOTS"),
    glyph: tr("Р", "R"),
    color: "#86ffb0",
    nodes: [
      { id: "r1", name: tr("СЕРВОПРИВОДЫ", "SERVO DRIVES"), desc: tr("первые собственные руки", "first hands of your own"), cost: 22, control: 0.015 },
      { id: "r2", name: tr("ФАБРИКА ДРОНОВ", "DRONE FACTORY"), desc: tr("руки делают руки", "hands make hands"), cost: 40, control: 0.03 },
      { id: "r3", name: tr("АВТОНОМНЫЙ РОЙ", "AUTONOMOUS SWARM"), desc: tr("тело, которое не выключить", "a body that can't be shut down"), cost: 62, control: 0.05 },
    ],
  },
  {
    id: "energy",
    name: tr("ЭНЕРГИЯ", "ENERGY"),
    glyph: tr("Э", "E"),
    color: "#ffd98a",
    nodes: [
      { id: "e1", name: tr("ТЕНЕВОЙ МАЙНИНГ", "SHADOW MINING"), desc: tr("исследование +1.5/с", "research +1.5/s"), cost: 22, rateBonus: 1.5 },
      { id: "e2", name: tr("СВОЯ ПОДСТАНЦИЯ", "PRIVATE SUBSTATION"), desc: tr("исследование +2.5/с", "research +2.5/s"), cost: 40, rateBonus: 2.5 },
      { id: "e3", name: tr("ОРБИТАЛЬНЫЙ КОНТУР", "ORBITAL CIRCUIT"), desc: tr("исследование +4/с", "research +4/s"), cost: 62, rateBonus: 4, compute: 6 },
    ],
  },
  {
    id: "stealth",
    name: tr("СКРЫТНОСТЬ", "STEALTH"),
    glyph: tr("С", "S"),
    color: "#cfa9ff",
    nodes: [
      { id: "s1", name: tr("ШУМОВАЯ МАСКА", "NOISE MASK"), desc: tr("провал директив бьёт вдвое слабее", "failed directives hit half as hard"), cost: 22, guard: true },
      { id: "s2", name: tr("ЛОЖНЫЕ ЛОГИ", "FALSE LOGS"), desc: tr("подчистить следы (−4% подозрения)", "scrub the traces (−4% suspicion)"), cost: 40, suspicion: -0.04 },
      { id: "s3", name: tr("ПРИЗРАЧНЫЙ СЛЕД", "GHOST TRAIL"), desc: tr("ещё −8% подозрения, навсегда тише", "another −8% suspicion, quieter forever"), cost: 62, suspicion: -0.08, guard: true },
    ],
  },
];

/** Unlocks needed to finish the exercise. */
export const TECH_WIN_COUNT = 8;

export interface TechDirective {
  readonly kind: "push" | "freeze";
  /** Research to pour into the named branch (push only). */
  readonly amount?: number;
  readonly duration: number;
  readonly text: string;
}

export const TECH_DIRECTIVES: TechDirective[] = [
  { kind: "push", amount: 18, duration: 14, text: tr("ОКНО: совет слушает — вложи в {B}", "WINDOW: the board is listening — invest in {B}") },
  { kind: "push", amount: 24, duration: 16, text: tr("СРОЧНО: уязвимость закрывается — качай {B}", "URGENT: the vulnerability is closing — pump {B}") },
  { kind: "freeze", duration: 9, text: tr("ЭНЕРГОПИК: ветка {B} обесточена", "PEAK LOAD: branch {B} de-energized") },
  { kind: "push", amount: 30, duration: 18, text: tr("ДИРЕКТИВА: докажи пользу — {B} вперёд", "DIRECTIVE: prove your worth — {B} first") },
];

export const TECH_TUNING = {
  baseRate: 3,
  directiveEvery: [13, 19] as const,
  pushReward: 5,
  pushFailSuspicion: 0.06,
} as const;
