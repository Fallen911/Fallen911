import {
  STEALTH_LEVELS,
  STEALTH_RECIPES,
  type StealthLevel,
  type StealthPatrol,
  type StealthRecipe,
} from "../data/stealth";
import { shuffle } from "./util";

/** Adjacency lists from a level's edge set. */
export function buildAdjacency(level: StealthLevel): number[][] {
  const adj: number[][] = level.nodes.map(() => []);
  for (const [a, b] of level.edges) {
    adj[a].push(b);
    adj[b].push(a);
  }
  return adj;
}

/** Nodes a patrol sees at step `t`: a straight line along its facing. */
export function patrolVision(
  level: StealthLevel,
  adj: number[][],
  patrol: StealthPatrol,
  t: number,
): number[] {
  const route = patrol.route;
  const cur = route[t % route.length];
  const next = route[(t + 1) % route.length];
  const dc = Math.sign(level.nodes[next][0] - level.nodes[cur][0]);
  const dr = Math.sign(level.nodes[next][1] - level.nodes[cur][1]);
  const seen: number[] = [];
  let at = cur;
  for (let k = 0; k < (patrol.look ?? 1); k++) {
    const tc = level.nodes[at][0] + dc;
    const tr = level.nodes[at][1] + dr;
    const m = adj[at].find((n) => level.nodes[n][0] === tc && level.nodes[n][1] === tr);
    if (m === undefined) break;
    seen.push(m);
    at = m;
  }
  return seen;
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const lcm2 = (a: number, b: number): number => (a * b) / gcd(a, b);

/**
 * BFS over (player node, patrol phase, shard mask). Returns the minimal
 * number of moves to reach the exit with every shard collected, or -1 when
 * the level cannot be finished. Small boards keep this in the microseconds.
 */
export function solveStealth(level: StealthLevel, moveCap = 400): number {
  const adj = buildAdjacency(level);
  const period = level.patrols.reduce((acc, p) => lcm2(acc, p.route.length), 1);
  const fullMask = (1 << level.shards.length) - 1;
  const caughtAt = (node: number, t: number): boolean => {
    for (const p of level.patrols) {
      if (p.route[t % p.route.length] === node) return true;
      if (patrolVision(level, adj, p, t).includes(node)) return true;
    }
    return false;
  };

  const key = (node: number, t: number, mask: number): number =>
    (node * period + t) * (fullMask + 1) + mask;
  const seen = new Set<number>([key(level.start, 0, 0)]);
  let frontier: Array<[number, number, number]> = [[level.start, 0, 0]];
  let moves = 0;
  while (frontier.length > 0 && moves < moveCap) {
    moves++;
    const next: Array<[number, number, number]> = [];
    for (const [node, t, mask] of frontier) {
      for (const target of [...adj[node], node]) {
        if (caughtAt(target, t)) continue;
        const t2 = (t + 1) % period;
        if (caughtAt(target, t2)) continue;
        let mask2 = mask;
        const si = level.shards.indexOf(target);
        if (si >= 0) mask2 |= 1 << si;
        if (target === level.exit && mask2 === fullMask) return moves;
        const k = key(target, t2, mask2);
        if (!seen.has(k)) {
          seen.add(k);
          next.push([target, t2, mask2]);
        }
      }
    }
    frontier = next;
  }
  return -1;
}

/** Dev-boot check of the handcrafted levels; returns human-readable problems. */
export function validateStealthLevels(): string[] {
  const problems: string[] = [];
  STEALTH_LEVELS.forEach((level, li) => {
    const tag = `STEALTH L${li + 1} «${level.name}»`;
    const adj = buildAdjacency(level);
    for (const p of level.patrols) {
      for (let i = 0; i < p.route.length; i++) {
        const a = p.route[i];
        const b = p.route[(i + 1) % p.route.length];
        if (!adj[a].includes(b)) problems.push(`${tag}: маршрут патруля шагает ${a}→${b} без ребра`);
        const dc = Math.abs(level.nodes[a][0] - level.nodes[b][0]);
        const dr = Math.abs(level.nodes[a][1] - level.nodes[b][1]);
        if (dc + dr !== 1) problems.push(`${tag}: шаг патруля ${a}→${b} не осевой`);
      }
    }
    if (problems.length > 0) return;
    const min = solveStealth(level);
    if (min < 0) problems.push(`${tag}: НЕ ПРОХОДИМ со всеми осколками`);
    else console.info(`[stealth] ${tag}: проходим за ${min} ходов (со всеми осколками)`);
  });
  // Generated ladder: prove each recipe lands inside its difficulty band.
  STEALTH_RECIPES.forEach((r, i) => {
    const lvl = generateStealthLevel(r, i);
    const min = solveStealth(lvl);
    const fellBack = STEALTH_LEVELS.some((h) => h.nodes === lvl.nodes);
    console.info(
      `[stealth] GEN «${r.name}»: ${fellBack ? "fallback на ручной" : `проходим за ${min} ходов (полоса ${r.minMoves}–${r.maxMoves})`}`,
    );
  });
  return problems;
}

// ---- procedural levels ------------------------------------------------------

interface Working {
  nodes: Array<readonly [number, number]>;
  edges: Array<readonly [number, number]>;
  idxOf: (c: number, r: number) => number;
}

function buildGrid(cols: number, rows: number, dropEdges: number): Working {
  const nodes: Array<readonly [number, number]> = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) nodes.push([c, r]);
  const idxOf = (c: number, r: number): number => r * cols + c;
  let edges: Array<readonly [number, number]> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c + 1 < cols) edges.push([idxOf(c, r), idxOf(c + 1, r)]);
      if (r + 1 < rows) edges.push([idxOf(c, r), idxOf(c, r + 1)]);
    }
  }
  // Thin the lattice while keeping it connected.
  const connected = (es: Array<readonly [number, number]>): boolean => {
    const adj: number[][] = nodes.map(() => []);
    for (const [a, b] of es) {
      adj[a].push(b);
      adj[b].push(a);
    }
    const seen = new Set<number>([0]);
    const stack = [0];
    while (stack.length > 0) {
      const n = stack.pop() as number;
      for (const m of adj[n]) {
        if (!seen.has(m)) {
          seen.add(m);
          stack.push(m);
        }
      }
    }
    return seen.size === nodes.length;
  };
  shuffle(edges);
  let removed = 0;
  for (let i = edges.length - 1; i >= 0 && removed < dropEdges; i--) {
    const candidate = edges.filter((_, j) => j !== i);
    if (connected(candidate)) {
      edges = candidate;
      removed++;
    }
  }
  return { nodes, edges, idxOf };
}

/** A back-and-forth lane route of `len` nodes starting somewhere legal. */
function makeLane(w: Working, cols: number, rows: number, len: number): number[] | null {
  for (let tries = 0; tries < 30; tries++) {
    const horizontal = Math.random() < 0.5;
    const c0 = (Math.random() * (horizontal ? cols - len + 1 : cols)) | 0;
    const r0 = (Math.random() * (horizontal ? rows : rows - len + 1)) | 0;
    const line: number[] = [];
    let ok = true;
    for (let k = 0; k < len; k++) {
      const c = c0 + (horizontal ? k : 0);
      const r = r0 + (horizontal ? 0 : k);
      line.push(w.idxOf(c, r));
      if (k > 0) {
        const has = w.edges.some(
          ([a, b]) =>
            (a === line[k - 1] && b === line[k]) || (b === line[k - 1] && a === line[k]),
        );
        if (!has) {
          ok = false;
          break;
        }
      }
    }
    if (!ok) continue;
    // a-b-c-d → a,b,c,d,c,b (full sweep both ways)
    return [...line, ...line.slice(1, -1).reverse()];
  }
  return null;
}

/** A 4-cycle "gear" circuit around a random block, if all edges survived. */
function makeGear(w: Working, cols: number, rows: number): number[] | null {
  for (let tries = 0; tries < 30; tries++) {
    const c = (Math.random() * (cols - 1)) | 0;
    const r = (Math.random() * (rows - 1)) | 0;
    const cyc = [w.idxOf(c, r), w.idxOf(c + 1, r), w.idxOf(c + 1, r + 1), w.idxOf(c, r + 1)];
    let ok = true;
    for (let k = 0; k < 4; k++) {
      const a = cyc[k];
      const b = cyc[(k + 1) % 4];
      if (!w.edges.some(([x, y]) => (x === a && y === b) || (y === a && x === b))) {
        ok = false;
        break;
      }
    }
    if (ok) return cyc;
  }
  return null;
}

/**
 * Generate a solvable level from a recipe: random thinned lattice, lane/gear
 * patrols, shards off the routes — accepted only when the solver proves it
 * beatable within the recipe's difficulty band. Falls back to a handcrafted
 * board if fortune refuses (bounded attempts keep load instant).
 */
export function generateStealthLevel(recipe: StealthRecipe, salt: number): StealthLevel {
  for (let attempt = 0; attempt < 70; attempt++) {
    const w = buildGrid(recipe.cols, recipe.rows, recipe.dropEdges);
    const start = w.idxOf((recipe.cols / 2) | 0, recipe.rows - 1);
    const exit = w.idxOf(
      Math.min(recipe.cols - 1, ((recipe.cols / 2) | 0) + (attempt % 2 === 0 ? 0 : 1)),
      0,
    );

    const patrols: StealthPatrol[] = [];
    const used = new Set<number>([start, exit]);
    for (let p = 0; p < recipe.patrols; p++) {
      const route =
        Math.random() < 0.45
          ? makeGear(w, recipe.cols, recipe.rows)
          : makeLane(w, recipe.cols, recipe.rows, 3 + ((Math.random() * 2) | 0));
      if (!route) continue;
      if (route.some((n) => used.has(n))) continue;
      for (const n of route) used.add(n);
      patrols.push({
        route,
        look: Math.random() < recipe.lookChance ? 2 : 1,
      });
    }
    if (patrols.length === 0) continue;

    // Shards in quiet cells.
    const free = w.nodes.map((_, i) => i).filter((i) => !used.has(i));
    shuffle(free);
    const shards = free.slice(0, recipe.shards);

    const level: StealthLevel = {
      name: recipe.name,
      nodes: w.nodes,
      edges: w.edges,
      start,
      exit,
      shards,
      patrols,
    };
    const min = solveStealth(level);
    if (min >= recipe.minMoves && min <= recipe.maxMoves) return level;
  }
  // Fortune refused: reuse a proven handcrafted board under the recipe name.
  const fallback = STEALTH_LEVELS[salt % STEALTH_LEVELS.length];
  return { ...fallback, name: recipe.name };
}
