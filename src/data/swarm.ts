/**
 * Mission script for the SWARM mechanic. Stages run in order, each with its
 * own goal and time budget; the raid composition and the map layout live here
 * so the encounter can be retuned without touching the simulation.
 */
export interface SwarmStage {
  readonly id: "mine" | "capture" | "defend";
  readonly title: string;
  readonly goal: string;
  readonly timeLimit: number;
}

export const SWARM_STAGES: SwarmStage[] = [
  { id: "mine", title: "ДОБЫЧА", goal: "собери 40 металла", timeLimit: 75 },
  { id: "capture", title: "ЗАХВАТ", goal: "возьми оба ретранслятора", timeLimit: 75 },
  { id: "defend", title: "ОБОРОНА", goal: "отбей рейд на хаб", timeLimit: 60 },
];

export const SWARM_CONFIG = {
  drones: 10,
  droneHp: 10,
  droneDps: 4,
  droneRange: 55,
  droneSpeed: 95,
  guardHp: 18,
  guardDps: 3.2,
  guardRange: 66,
  raidBotHp: 14,
  raidBotDps: 5,
  raidSize: [5, 4] as const, // two waves
  hubHp: 60,
  metalGoal: 40,
  veinCapacity: 60,
  /** Layout in normalized field coordinates. */
  hub: { x: 0.5, y: 0.8 },
  veins: [
    { x: 0.18, y: 0.5 },
    { x: 0.82, y: 0.55 },
  ],
  relays: [
    { x: 0.24, y: 0.2 },
    { x: 0.76, y: 0.22 },
  ],
} as const;
