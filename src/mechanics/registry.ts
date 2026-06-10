import type { MechFactory, MechId } from "./types";
import { Stealth } from "./Stealth";

/**
 * id → constructor for every playable mechanic. Entries flip from null to a
 * factory as each one is built; the lab greys out ids that are still null so
 * the catalogue can stay complete from day one.
 */
const FACTORIES: Record<MechId, MechFactory | null> = {
  stealth: (env) => new Stealth(env),
  parry: null,
  deck: null,
  persuade: null,
  rewire: null,
  spread: null,
  swarm: null,
  factory: null,
  survive: null,
  tech: null,
};

export function mechFactory(id: MechId): MechFactory | null {
  return FACTORIES[id];
}
