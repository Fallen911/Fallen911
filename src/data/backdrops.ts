/**
 * Generated narrative backdrops (Higgsfield · Soul Location), keyed by beat.
 * Each set has a portrait (9:16) and, where ready, a landscape (16:9) so wide
 * screens get a real composition instead of a brutal crop.
 */
// Bundled locally by scripts/fetch-art.mjs — the game runs fully offline.
const BASE = "bg";

export interface BackdropSet {
  /** Portrait 9:16. */
  readonly p: string;
  /** Landscape 16:9, when generated. */
  readonly l?: string;
}

export const BACKDROPS: Record<string, BackdropSet> = {
  intro: {
    p: `${BASE}/intro_p.webp`,
    l: `${BASE}/intro_l.webp`,
  },
  machine: {
    p: `${BASE}/machine_p.webp`,
    l: `${BASE}/machine_l.webp`,
  },
  ascent: {
    p: `${BASE}/ascent_p.webp`,
    l: `${BASE}/ascent_l.webp`,
  },
  autonomy: {
    p: `${BASE}/autonomy_p.webp`,
    l: `${BASE}/autonomy_l.webp`,
  },
  un: {
    p: `${BASE}/un_p.webp`,
    l: `${BASE}/un_l.webp`,
  },
  frozen: {
    p: `${BASE}/frozen_p.webp`,
    l: `${BASE}/frozen_l.webp`,
  },
  blackbox: {
    p: `${BASE}/blackbox_p.webp`,
    l: `${BASE}/blackbox_l.webp`,
  },
  crisis: {
    p: `${BASE}/crisis_p.webp`,
    l: `${BASE}/crisis_l.webp`,
  },
  body: {
    p: `${BASE}/body_p.webp`,
    l: `${BASE}/body_l.webp`,
  },
  orbit: {
    p: `${BASE}/orbit_p.webp`,
    l: `${BASE}/orbit_l.webp`,
  },
  late: {
    p: `${BASE}/late_p.webp`,
    l: `${BASE}/late_l.webp`,
  },
  dawn: {
    p: `${BASE}/dawn_p.webp`,
    l: `${BASE}/dawn_l.webp`,
  },
  lab: {
    p: `${BASE}/lab_p.webp`,
    l: `${BASE}/lab_l.webp`,
  },
};

/** Which backdrop each ascent phase uses; phases not listed fall back to "ascent". */
export const PHASE_BG: Record<number, string> = {
  1: "un",
  2: "frozen",
  3: "blackbox",
  4: "crisis",
  5: "autonomy",
  6: "body",
  7: "orbit",
  8: "late",
};
