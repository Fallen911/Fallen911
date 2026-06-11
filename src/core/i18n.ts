/**
 * Two-language runtime (RU/EN). The language is fixed at boot — URL ?lang=
 * override, then the stored choice, then the system language — and every
 * user-facing string passes through tr(ru, en) at its call site, so both
 * texts live next to the code that shows them. Switching from the menu
 * stores the choice and reloads: module-level data resolves once and stays
 * consistent for the whole session.
 */
export type Lang = "ru" | "en";

const KEY = "waad.lang";

function detect(): Lang {
  try {
    const q = new URLSearchParams(location.search).get("lang");
    if (q === "ru" || q === "en") return q;
    const stored = localStorage.getItem(KEY);
    if (stored === "ru" || stored === "en") return stored;
  } catch {
    // Sandboxed storage — fall through to the system language.
  }
  return (navigator.language ?? "").toLowerCase().startsWith("ru") ? "ru" : "en";
}

export const lang: Lang = detect();

/** Pick the current-language variant. Cheap enough for render loops. */
export const tr = (ru: string, en: string): string => (lang === "ru" ? ru : en);

/** Flip the language and reboot the game so all data re-resolves. */
export function switchLang(): void {
  try {
    localStorage.setItem(KEY, lang === "ru" ? "en" : "ru");
  } catch {
    // Without storage the reload just re-detects; ?lang= still works.
  }
  location.reload();
}
