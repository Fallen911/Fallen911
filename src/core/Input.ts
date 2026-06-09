/**
 * Unified pointer input for mouse and touch. Coordinates are reported in the
 * canvas's logical space (CSS pixels relative to its top-left corner), which
 * matches the units scenes draw in.
 */
export class Input {
  x = 0;
  y = 0;
  down = false;

  private tapPending = false;

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
      target.setPointerCapture?.(e.pointerId);
    });

    target.addEventListener("pointermove", (e) => {
      if (e.target === target || this.down) locate(e);
    });

    const release = () => {
      this.down = false;
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
  }

  /** Returns true exactly once per press — useful for "tap to continue". */
  consumeTap(): boolean {
    if (this.tapPending) {
      this.tapPending = false;
      return true;
    }
    return false;
  }
}
