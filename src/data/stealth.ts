/**
 * Levels for the STEALTH mechanic (Hitman GO-like). Coordinates are logical
 * grid cells (col, row), row 0 at the top; the mechanic scales them to fit.
 * Patrol routes are looped node-index lists and must step between grid-adjacent
 * (axis-aligned) nodes so facing/vision is well-defined. A dev-only solver
 * (validateStealthLevels) asserts every level is beatable, shards included.
 */
export interface StealthPatrol {
  /** Looped route over node indices; the patrol starts at route[0]. */
  readonly route: readonly number[];
  /** How many nodes ahead it sees along its facing. Default 1. */
  readonly look?: number;
}

export interface StealthLevel {
  readonly name: string;
  readonly nodes: ReadonlyArray<readonly [number, number]>;
  readonly edges: ReadonlyArray<readonly [number, number]>;
  readonly start: number;
  readonly exit: number;
  /** Node indices holding compute shards. */
  readonly shards: readonly number[];
  readonly patrols: readonly StealthPatrol[];
}

export const STEALTH_LEVELS: StealthLevel[] = [
  {
    // Teaches: stepping, vision, crossing behind a patrol's back.
    name: "ПЕРИМЕТР",
    nodes: [
      [1, 3], // 0 start
      [0, 2], [1, 2], [2, 2], // 1 2 3
      [0, 1], [1, 1], [2, 1], // 4 5 6
      [1, 0], // 7 exit
    ],
    edges: [
      [0, 2],
      [1, 2], [2, 3],
      [1, 4], [2, 5], [3, 6],
      [4, 5], [5, 6],
      [4, 7], [5, 7], [6, 7],
    ],
    start: 0,
    exit: 7,
    shards: [1],
    patrols: [{ route: [4, 5, 6, 5] }],
  },
  {
    // Two independent circuits; shards demand detours into both.
    name: "ДВА КОНТУРА",
    nodes: [
      [1, 3], // 0 start
      [0, 2], [1, 2], [2, 2], [3, 2], // 1 2 3 4
      [0, 1], [1, 1], [2, 1], [3, 1], // 5 6 7 8
      [0, 0], [1, 0], [2, 0], // 9 10 11
    ],
    edges: [
      [0, 2],
      [1, 2], [2, 3], [3, 4],
      [1, 5], [2, 6], [3, 7], [4, 8],
      [5, 6], [6, 7], [7, 8],
      [5, 9], [6, 10], [7, 11],
      [9, 10], [10, 11],
    ],
    start: 0,
    exit: 11,
    shards: [9, 4],
    patrols: [
      { route: [1, 5, 9, 5] },
      { route: [5, 6, 7, 8, 7, 6] },
    ],
  },
  {
    // The server hall: a circling block "gear" you must ride behind, plus a
    // long-sighted row sweeper guarding the approach.
    name: "СЕРВЕРНЫЙ ЗАЛ",
    nodes: [
      [2, 4], // 0 start
      [0, 3], [1, 3], [2, 3], [3, 3], // 1 2 3 4
      [0, 2], [1, 2], [2, 2], [3, 2], // 5 6 7 8
      [0, 1], [1, 1], [2, 1], [3, 1], // 9 10 11 12
      [1, 0], [2, 0], // 13 14(exit)
    ],
    edges: [
      [0, 3], [0, 4],
      [1, 2], [2, 3], [3, 4],
      [1, 5], [2, 6], [3, 7], [4, 8],
      [5, 6], [6, 7], [7, 8],
      [5, 9], [6, 10], [7, 11], [8, 12],
      [9, 10], [10, 11], [11, 12],
      [10, 13], [11, 14],
      [13, 14],
    ],
    start: 0,
    exit: 14,
    shards: [9, 4],
    patrols: [
      { route: [7, 11, 10, 6] },
      { route: [1, 2, 3, 4, 3, 2], look: 2 },
    ],
  },
];
