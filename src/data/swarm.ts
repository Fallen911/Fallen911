/**
 * Mission script for the SWARM mechanic. Each mission carries its own map
 * (hub, veins, guarded relays), economy goal, raid composition and stage time
 * budgets; unit stats shared by every mission live in SWARM_CONFIG. The story
 * phase plays the first mission, the lab ladder runs them all.
 */
export interface SwarmStage {
  readonly id: "mine" | "capture" | "defend";
  readonly title: string;
}

export const SWARM_STAGES: SwarmStage[] = [
  { id: "mine", title: "ДОБЫЧА" },
  { id: "capture", title: "ЗАХВАТ" },
  { id: "defend", title: "ОБОРОНА" },
];

export interface SwarmSpot {
  readonly x: number;
  readonly y: number;
}

export interface SwarmMission {
  readonly name: string;
  readonly drones: number;
  readonly metalGoal: number;
  readonly veinCapacity: number;
  readonly hub: SwarmSpot;
  readonly veins: readonly SwarmSpot[];
  readonly relays: ReadonlyArray<SwarmSpot & { readonly guards: number }>;
  /** Raid waves attacking the hub in the defend stage. */
  readonly raidWaves: readonly number[];
  /** Seconds budgeted per stage (mine, capture, defend). */
  readonly timeLimits: readonly [number, number, number];
}

export const SWARM_MISSIONS: SwarmMission[] = [
  {
    name: "ПЛАЦДАРМ",
    drones: 10,
    metalGoal: 40,
    veinCapacity: 60,
    hub: { x: 0.5, y: 0.8 },
    veins: [
      { x: 0.18, y: 0.5 },
      { x: 0.82, y: 0.55 },
    ],
    relays: [
      { x: 0.24, y: 0.2, guards: 2 },
      { x: 0.76, y: 0.22, guards: 2 },
    ],
    raidWaves: [5, 4],
    timeLimits: [75, 75, 60],
  },
  {
    name: "ТРИ БАШНИ",
    drones: 12,
    metalGoal: 50,
    veinCapacity: 45,
    hub: { x: 0.5, y: 0.84 },
    veins: [
      { x: 0.14, y: 0.62 },
      { x: 0.86, y: 0.6 },
      { x: 0.5, y: 0.34 },
    ],
    relays: [
      { x: 0.18, y: 0.18, guards: 2 },
      { x: 0.82, y: 0.2, guards: 2 },
      { x: 0.5, y: 0.09, guards: 3 },
    ],
    raidWaves: [6, 5, 4],
    timeLimits: [70, 80, 75],
  },
  {
    name: "УЗКОЕ ГОРЛО", drones: 9, metalGoal: 44, veinCapacity: 50,
    hub: { x: 0.5, y: 0.86 },
    veins: [{ x: 0.5, y: 0.56 }, { x: 0.5, y: 0.3 }],
    relays: [{ x: 0.16, y: 0.14, guards: 2 }, { x: 0.84, y: 0.14, guards: 2 }],
    raidWaves: [6, 6], timeLimits: [70, 75, 65],
  },
  {
    name: "ДВА ФРОНТА", drones: 12, metalGoal: 54, veinCapacity: 40,
    hub: { x: 0.5, y: 0.5 },
    veins: [{ x: 0.12, y: 0.5 }, { x: 0.88, y: 0.5 }],
    relays: [{ x: 0.12, y: 0.12, guards: 3 }, { x: 0.88, y: 0.88, guards: 3 }],
    raidWaves: [5, 5, 5], timeLimits: [70, 80, 75],
  },
  {
    name: "КАРЬЕР", drones: 10, metalGoal: 70, veinCapacity: 30,
    hub: { x: 0.5, y: 0.82 },
    veins: [{ x: 0.2, y: 0.62 }, { x: 0.5, y: 0.44 }, { x: 0.8, y: 0.62 }],
    relays: [{ x: 0.5, y: 0.12, guards: 4 }],
    raidWaves: [7, 6], timeLimits: [85, 70, 70],
  },
  {
    name: "ОСАЖДЁННЫЙ", drones: 14, metalGoal: 50, veinCapacity: 45,
    hub: { x: 0.5, y: 0.8 },
    veins: [{ x: 0.18, y: 0.5 }, { x: 0.82, y: 0.55 }],
    relays: [{ x: 0.24, y: 0.18, guards: 3 }, { x: 0.76, y: 0.2, guards: 3 }],
    raidWaves: [6, 6, 6], timeLimits: [65, 70, 85],
  },
  {
    name: "ПАУТИНА", drones: 12, metalGoal: 60, veinCapacity: 35,
    hub: { x: 0.5, y: 0.88 },
    veins: [{ x: 0.14, y: 0.66 }, { x: 0.86, y: 0.66 }],
    relays: [
      { x: 0.14, y: 0.3, guards: 2 }, { x: 0.5, y: 0.16, guards: 2 }, { x: 0.86, y: 0.3, guards: 2 },
    ],
    raidWaves: [6, 6, 5], timeLimits: [75, 90, 75],
  },
  {
    name: "ХОЛОДНАЯ ЖИЛА", drones: 11, metalGoal: 64, veinCapacity: 32,
    hub: { x: 0.2, y: 0.84 },
    veins: [{ x: 0.8, y: 0.2 }, { x: 0.84, y: 0.7 }],
    relays: [{ x: 0.2, y: 0.18, guards: 3 }, { x: 0.55, y: 0.42, guards: 2 }],
    raidWaves: [7, 6, 5], timeLimits: [85, 80, 75],
  },
  {
    name: "ТРИПЛЕКС", drones: 13, metalGoal: 70, veinCapacity: 35,
    hub: { x: 0.5, y: 0.5 },
    veins: [{ x: 0.15, y: 0.2 }, { x: 0.85, y: 0.2 }, { x: 0.5, y: 0.86 }],
    relays: [
      { x: 0.15, y: 0.8, guards: 3 }, { x: 0.85, y: 0.8, guards: 3 }, { x: 0.5, y: 0.12, guards: 3 },
    ],
    raidWaves: [6, 6, 6], timeLimits: [80, 90, 80],
  },
  {
    name: "ПОСЛЕДНИЙ РУБЕЖ", drones: 15, metalGoal: 80, veinCapacity: 40,
    hub: { x: 0.5, y: 0.82 },
    veins: [{ x: 0.14, y: 0.56 }, { x: 0.86, y: 0.56 }, { x: 0.5, y: 0.34 }],
    relays: [
      { x: 0.16, y: 0.16, guards: 3 }, { x: 0.84, y: 0.16, guards: 3 },
      { x: 0.5, y: 0.08, guards: 4 },
    ],
    raidWaves: [8, 7, 6, 5], timeLimits: [85, 95, 100],
  },
];

export const SWARM_CONFIG = {
  droneHp: 10,
  droneDps: 4,
  droneRange: 55,
  droneSpeed: 95,
  guardHp: 18,
  guardDps: 3.2,
  guardRange: 66,
  raidBotHp: 14,
  raidBotDps: 5,
  hubHp: 60,
} as const;
