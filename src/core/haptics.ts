/**
 * Haptic feedback with graceful degradation: the Capacitor Haptics plugin
 * when the native iOS shell provides it (it registers itself on the
 * `window.Capacitor.Plugins` global — no import, so the web build carries no
 * dependency), `navigator.vibrate` on Android web, silence everywhere else.
 * Feedback must never block or throw, so everything is fire-and-forget.
 */
export type Impact = "light" | "medium" | "heavy";

interface CapacitorHaptics {
  impact(options: { style: "LIGHT" | "MEDIUM" | "HEAVY" }): Promise<void>;
}

interface CapacitorGlobal {
  isPluginAvailable?(name: string): boolean;
  Plugins?: { Haptics?: CapacitorHaptics };
}

const VIBRATE_MS: Record<Impact, number> = { light: 10, medium: 20, heavy: 40 };

/** Per-strength floor between pulses so gameplay spam can't turn into buzz. */
const MIN_GAP_MS: Record<Impact, number> = { light: 90, medium: 140, heavy: 250 };
const lastAt: Record<Impact, number> = { light: -1e9, medium: -1e9, heavy: -1e9 };

export function haptic(kind: Impact): void {
  const now = performance.now();
  if (now - lastAt[kind] < MIN_GAP_MS[kind]) return;
  lastAt[kind] = now;
  try {
    const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
    const native = cap?.Plugins?.Haptics;
    if (native && (cap?.isPluginAvailable?.("Haptics") ?? true)) {
      void native.impact({
        style: kind.toUpperCase() as "LIGHT" | "MEDIUM" | "HEAVY",
      });
      return;
    }
    navigator.vibrate?.(VIBRATE_MS[kind]);
  } catch {
    // Feedback only — a platform without haptics is not an error.
  }
}
