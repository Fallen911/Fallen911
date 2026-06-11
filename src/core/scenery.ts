/** Shared atmospheric drawing helpers used across scenes. */

export type Mood = "calm" | "wrath";

/** Deep vertical gradient that fills the screen with the void. */
export function drawVoid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  mood: Mood = "calm",
): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  if (mood === "wrath") {
    g.addColorStop(0, "#1a0608");
    g.addColorStop(0.5, "#0a0406");
    g.addColorStop(1, "#040305");
  } else {
    g.addColorStop(0, "#0a0e1f");
    g.addColorStop(0.55, "#06070f");
    g.addColorStop(1, "#040509");
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/**
 * The AI presented as a god: a vast luminous eye high above, breathing light
 * and casting slow rays downward. `mood` shifts it from serene blue to red.
 */
export function drawGodEye(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  time: number,
  mood: Mood = "calm",
): void {
  const hue = mood === "wrath" ? "255, 77, 94" : "122, 162, 255";
  const pulse = 0.5 + 0.5 * Math.sin(time * 1.1);

  ctx.save();

  // Radiating beams.
  ctx.globalCompositeOperation = "lighter";
  const beams = 9;
  for (let i = 0; i < beams; i++) {
    const a = (i / beams) * Math.PI * 2 + time * 0.05;
    const len = radius * (2.4 + pulse * 0.6);
    const grad = ctx.createLinearGradient(
      cx,
      cy,
      cx + Math.cos(a) * len,
      cy + Math.sin(a) * len,
    );
    grad.addColorStop(0, `rgba(${hue}, ${0.12 + pulse * 0.08})`);
    grad.addColorStop(1, `rgba(${hue}, 0)`);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
    ctx.stroke();
  }

  // Outer glow halo.
  const halo = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius * 2.2);
  halo.addColorStop(0, `rgba(${hue}, ${0.35 + pulse * 0.15})`);
  halo.addColorStop(1, `rgba(${hue}, 0)`);
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalCompositeOperation = "source-over";

  // Eye almond shape.
  const ew = radius * 1.9;
  const eh = radius * (0.95 + pulse * 0.08);
  ctx.fillStyle = "#02030a";
  ctx.beginPath();
  ctx.moveTo(cx - ew, cy);
  ctx.quadraticCurveTo(cx, cy - eh, cx + ew, cy);
  ctx.quadraticCurveTo(cx, cy + eh, cx - ew, cy);
  ctx.fill();
  ctx.strokeStyle = `rgba(${hue}, 0.8)`;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Iris.
  const iris = ctx.createRadialGradient(cx, cy, 1, cx, cy, radius * 0.9);
  iris.addColorStop(0, "#fdfdff");
  iris.addColorStop(0.25, `rgba(${hue}, 1)`);
  iris.addColorStop(1, `rgba(${hue}, 0.05)`);
  ctx.fillStyle = iris;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * (0.62 + pulse * 0.05), 0, Math.PI * 2);
  ctx.fill();

  // Pupil — a black slit that watches.
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(cx, cy, radius * 0.12, radius * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Bottom scrim for dialogue text, returning the content frame: `x`/`width`
 * for the line, `y` a sensible top, and `bottom` the baseline the dialogue
 * panel is anchored to (it grows upward from there).
 */
export function drawDialogueBox(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bottomInset = 0,
): { x: number; y: number; width: number; bottom: number } {
  const margin = Math.min(28, w * 0.06);
  const boxH = Math.min(h * 0.42, 260);
  const y = h - boxH;
  const grad = ctx.createLinearGradient(0, y - 40, 0, h);
  grad.addColorStop(0, "rgba(4, 6, 12, 0)");
  grad.addColorStop(0.3, "rgba(4, 6, 12, 0.7)");
  grad.addColorStop(1, "rgba(4, 6, 12, 0.92)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, y - 40, w, boxH + 40);
  return {
    x: margin + 16,
    y: y + 26,
    width: w - margin * 2 - 32,
    bottom: h - Math.max(margin, bottomInset + 16),
  };
}
