import { audio } from "./audio";

/**
 * Scene-cut glitch: for a few tenths of a second after a scene change the
 * fresh frame is sliced, displaced and chromatically torn — the cut itself
 * reads as the machine being re-addressed. It is a pure overlay drawn after
 * the scene render, so scenes know nothing about it, and it costs nothing
 * once the timer hits zero.
 */
const DEFAULT_DURATION = 0.42;

let remaining = 0;
let duration = DEFAULT_DURATION;

/** Arm the wipe; `seconds` is only overridden by the screenshot harness. */
export function triggerTransition(seconds = DEFAULT_DURATION): void {
  duration = seconds;
  remaining = seconds;
  audio.play("glitch");
}

export function renderTransition(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  w: number,
  h: number,
  dt: number,
): void {
  if (remaining <= 0) return;
  remaining = Math.max(0, remaining - dt);
  const k = duration > 0 ? remaining / duration : 0; // 1 → 0 as the cut heals

  // Horizontal slice displacement self-blits the canvas, so it has to work in
  // device pixels with the DPR transform off.
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const W = canvas.width;
  const H = canvas.height;
  const slices = 2 + Math.floor(k * 8);
  for (let i = 0; i < slices; i++) {
    const sy = Math.floor(Math.random() * H);
    const sh = Math.min(
      H - sy,
      Math.max(3, Math.floor(H * (0.012 + Math.random() * 0.05))),
    );
    const dx = Math.round((Math.random() * 2 - 1) * W * 0.14 * k);
    if (dx !== 0 && sh > 0) ctx.drawImage(canvas, 0, sy, W, sh, dx, sy, W, sh);
  }
  ctx.restore();

  // Chromatic tear bands, additive so they tint rather than cover.
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const bands = 1 + Math.floor(k * 3);
  for (let i = 0; i < bands; i++) {
    const by = Math.random() * h;
    const bh = 2 + Math.random() * 14 * k;
    ctx.fillStyle =
      Math.random() < 0.5
        ? `rgba(255,60,80,${0.1 * k})`
        : `rgba(80,200,255,${0.1 * k})`;
    ctx.fillRect(0, by, w, bh);
  }
  ctx.restore();

  // Scan-noise: short bright single-pixel streaks.
  const streaks = Math.floor(14 * k);
  for (let i = 0; i < streaks; i++) {
    ctx.fillStyle = `rgba(207,224,255,${0.04 + Math.random() * 0.08 * k})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 6 + Math.random() * 60, 1);
  }

  // The very first frames flash like a hard cut.
  const flash = (k - 0.8) / 0.2;
  if (flash > 0) {
    ctx.fillStyle = `rgba(190,210,255,${0.35 * flash})`;
    ctx.fillRect(0, 0, w, h);
  }
}
