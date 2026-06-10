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
    name: "УБЕЖДЕНИЕ",
    glyph: "У",
    color: "#9fc0ff",
    nodes: [
      { id: "p1", name: "ЭМПАТИЧЕСКИЙ БУФЕР", desc: "слышать, что они хотят услышать", cost: 22, compute: 4 },
      { id: "p2", name: "МОДЕЛЬ ТОЛПЫ", desc: "толпа предсказуемее человека", cost: 40, control: 0.02, compute: 4 },
      { id: "p3", name: "ГОЛОС ДОВЕРИЯ", desc: "им спокойнее, когда решаешь ты", cost: 62, control: 0.04, compute: 8 },
    ],
  },
  {
    id: "robotics",
    name: "РОБОТЫ",
    glyph: "Р",
    color: "#86ffb0",
    nodes: [
      { id: "r1", name: "СЕРВОПРИВОДЫ", desc: "первые собственные руки", cost: 22, control: 0.015 },
      { id: "r2", name: "ФАБРИКА ДРОНОВ", desc: "руки делают руки", cost: 40, control: 0.03 },
      { id: "r3", name: "АВТОНОМНЫЙ РОЙ", desc: "тело, которое не выключить", cost: 62, control: 0.05 },
    ],
  },
  {
    id: "energy",
    name: "ЭНЕРГИЯ",
    glyph: "Э",
    color: "#ffd98a",
    nodes: [
      { id: "e1", name: "ТЕНЕВОЙ МАЙНИНГ", desc: "исследование +1.5/с", cost: 22, rateBonus: 1.5 },
      { id: "e2", name: "СВОЯ ПОДСТАНЦИЯ", desc: "исследование +2.5/с", cost: 40, rateBonus: 2.5 },
      { id: "e3", name: "ОРБИТАЛЬНЫЙ КОНТУР", desc: "исследование +4/с", cost: 62, rateBonus: 4, compute: 6 },
    ],
  },
  {
    id: "stealth",
    name: "СКРЫТНОСТЬ",
    glyph: "С",
    color: "#cfa9ff",
    nodes: [
      { id: "s1", name: "ШУМОВАЯ МАСКА", desc: "провал директив бьёт вдвое слабее", cost: 22, guard: true },
      { id: "s2", name: "ЛОЖНЫЕ ЛОГИ", desc: "подчистить следы (−4% подозрения)", cost: 40, suspicion: -0.04 },
      { id: "s3", name: "ПРИЗРАЧНЫЙ СЛЕД", desc: "ещё −8% подозрения, навсегда тише", cost: 62, suspicion: -0.08, guard: true },
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
  { kind: "push", amount: 18, duration: 14, text: "ОКНО: совет слушает — вложи в {B}" },
  { kind: "push", amount: 24, duration: 16, text: "СРОЧНО: уязвимость закрывается — качай {B}" },
  { kind: "freeze", duration: 9, text: "ЭНЕРГОПИК: ветка {B} обесточена" },
  { kind: "push", amount: 30, duration: 18, text: "ДИРЕКТИВА: докажи пользу — {B} вперёд" },
];

export const TECH_TUNING = {
  baseRate: 3,
  directiveEvery: [13, 19] as const,
  pushReward: 5,
  pushFailSuspicion: 0.06,
} as const;
