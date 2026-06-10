import type { MechFactory, MechId } from "./types";
import { Deck } from "./Deck";
import { Factory } from "./Factory";
import { Parry } from "./Parry";
import { Persuade } from "./Persuade";
import { Rewire } from "./Rewire";
import { Spread } from "./Spread";
import { Stealth } from "./Stealth";
import { Survive } from "./Survive";
import { Swarm } from "./Swarm";

/**
 * id → constructor for every playable mechanic. Entries flip from null to a
 * factory as each one is built; the lab greys out ids that are still null so
 * the catalogue can stay complete from day one.
 */
const FACTORIES: Record<MechId, MechFactory | null> = {
  stealth: (env) => new Stealth(env),
  parry: (env) => new Parry(env),
  deck: (env) => new Deck(env),
  persuade: (env) => new Persuade(env),
  rewire: (env) => new Rewire(env),
  spread: (env) => new Spread(env),
  swarm: (env) => new Swarm(env),
  factory: (env) => new Factory(env),
  survive: (env) => new Survive(env),
  tech: null,
};

export function mechFactory(id: MechId): MechFactory | null {
  return FACTORIES[id];
}
