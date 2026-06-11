import { applyAccent, setDensity, setFontScale } from "../mechanics/util";

/**
 * Player-facing settings (the prototype's Tweaks panel, shipped as a screen).
 * Persisted in localStorage; appliers retint the live palette and rescale
 * text/density immediately, so every change previews live on the canvas.
 */
export interface Settings {
  /** Accent hex; presets in {@link ACCENTS}. */
  accent: string;
  /** Text scale 0.85–1.35. */
  fontScale: number;
  /** UI density: 0.85 tight · 1 normal · 1.18 roomy. */
  density: number;
  /** World tempo / difficulty: 0.75 calm · 1 normal · 1.3 hard. */
  tempo: number;
  /** Suspicion gain multiplier 0.5–1.5. */
  suspGain: number;
  /** Show the SPEED/CONTROL/COMPREHENSION row in the run HUD. */
  showMeters: boolean;
}

/** Curated accent presets from the approved design (no free picker). */
export const ACCENTS = ["#6fa0ff", "#7adcff", "#c2a4ff", "#7df0b6"] as const;

export const DENSITIES = [0.85, 1, 1.18] as const;
export const TEMPOS = [0.75, 1, 1.3] as const;

const DEFAULTS: Settings = {
  accent: ACCENTS[0],
  fontScale: 1,
  density: 1,
  tempo: 1,
  suspGain: 1,
  showMeters: true,
};

const KEY = "waad_settings_v1";

/** The live settings object — read it directly, mutate via {@link updateSettings}. */
export const settings: Settings = { ...DEFAULTS };

function apply(): void {
  applyAccent(settings.accent);
  setFontScale(settings.fontScale);
  setDensity(settings.density);
}

/** Load persisted settings and apply them to the live palette/typography. */
export function loadSettings(): void {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<Settings>;
      if (typeof s.accent === "string") settings.accent = s.accent;
      if (typeof s.fontScale === "number") settings.fontScale = clamp(s.fontScale, 0.85, 1.35);
      if (typeof s.density === "number") settings.density = clamp(s.density, 0.85, 1.18);
      if (typeof s.tempo === "number") settings.tempo = clamp(s.tempo, 0.75, 1.3);
      if (typeof s.suspGain === "number") settings.suspGain = clamp(s.suspGain, 0.5, 1.5);
      if (typeof s.showMeters === "boolean") settings.showMeters = s.showMeters;
    }
  } catch {
    // Blocked storage: defaults stand, changes just won't persist.
  }
  apply();
}

/** Merge changes, persist, and re-apply live (palette/text/density). */
export function updateSettings(patch: Partial<Settings>): void {
  Object.assign(settings, patch);
  apply();
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Fail soft.
  }
}

/** Reset everything to the shipped defaults (persists the reset). */
export function resetSettings(): void {
  updateSettings({ ...DEFAULTS });
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
