/**
 * Unified pointer input for mouse and touch. Coordinates are reported in the
 * canvas's logical space (CSS pixels relative to its top-left corner), which
 * matches the units scenes draw in.
 *
 * Two layers, both live at once:
 *  - raw: `x`/`y`/`down` and `consumeTap()` (fires on press) — unchanged.
 *  - semantic: `pollGesture()` resolves a press into a `tap` or a directional
 *    `swipe` on release. Scenes opt into whichever they need.
 */
export type SwipeDir = "left" | "right" | "up" | "down";

export type Gesture =
  | { type: "tap" }
  | { type: "swipe"; dir: SwipeDir; dx: number; dy: number };

export class Input {
  x = 0;
  y = 0;
  down = false;

  private tapPending = false;
  private gesture: Gesture | null = null;
  private startX = 0;
  private startY = 0;
  private startT = 0;

  // A press that moves less than this and lifts within the time window reads
  // as a tap; one that travels past the swipe distance reads as a swipe.
  private static readonly TAP_SLOP = 10;
  private static readonly TAP_TIME = 400;
  private static readonly SWIPE_MIN = 40;

  constructor(target: HTMLElement) {
    const locate = (e: PointerEvent) => {
      const rect = target.getBoundingClientRect();
      this.x = e.clientX - rect.left;
      this.y = e.clientY - rect.top;
    };

    target.addEventListener("pointerdown", (e) => {
      locate(e);
      this.down = true;
      this.tapPending = true;
      this.startX = this.x;
      this.startY = this.y;
      this.startT = performance.now();
      target.setPointerCapture?.(e.pointerId);
    });

    target.addEventListener("pointermove", (e) => {
      if (e.target === target || this.down) locate(e);
    });

    target.addEventListener("pointerup", () => {
      this.down = false;
      this.resolveGesture();
    });
    window.addEventListener("pointerup", () => {
      this.down = false;
    });
    window.addEventListener("pointercancel", () => {
      this.down = false;
    });
  }

  private resolveGesture(): void {
    const dx = this.x - this.startX;
    const dy = this.y - this.startY;
    const dist = Math.hypot(dx, dy);

    if (dist >= Input.SWIPE_MIN) {
      const dir: SwipeDir =
        Math.abs(dx) >= Math.abs(dy)
          ? dx > 0
            ? "right"
            : "left"
          : dy > 0
            ? "down"
            : "up";
      this.gesture = { type: "swipe", dir, dx, dy };
      return;
    }

    const elapsed = performance.now() - this.startT;
    if (dist <= Input.TAP_SLOP && elapsed <= Input.TAP_TIME) {
      this.gesture = { type: "tap" };
    }
  }

  /** Returns true exactly once per press — useful for "tap to continue". */
  consumeTap(): boolean {
    if (this.tapPending) {
      this.tapPending = false;
      return true;
    }
    return false;
  }

  /**
   * True while an unconsumed press is pending, without consuming it. Lets a
   * host scene hit-test its chrome and take the tap only when it owns it,
   * leaving everything else for the embedded mechanic.
   */
  peekTap(): boolean {
    return this.tapPending;
  }

  /** Semantic gesture resolved on release, consumed once. Null if none/pending. */
  pollGesture(): Gesture | null {
    const g = this.gesture;
    this.gesture = null;
    return g;
  }
}
