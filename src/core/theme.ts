import { C, SURF, fs, roundRect, sans } from "../mechanics/util";

/**
 * v2 design-system primitives, drawn on the canvas. The HTML prototype is the
 * source of truth (see the design handoff); this reproduces its panels, chips,
 * buttons, labels and the prominent suspicion meter so every scene reads as one
 * system. Geometry: radius 14 cards/buttons, 10 chips; tap targets ≥44px.
 */

export const RADIUS = 14;
export const CHIP_RADIUS = 10;

/** Full-screen scrim so text never sits on a raw background image. */
export function scrim(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "rgba(4,6,12,0.88)");
  g.addColorStop(0.3, "rgba(4,6,12,0.55)");
  g.addColorStop(0.7, "rgba(4,6,12,0.62)");
  g.addColorStop(1, "rgba(4,6,12,0.95)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

export interface PanelOpts {
  /** Opaque panel instead of the translucent default. */
  solid?: boolean;
  /** Brighter stroke (used for the active/hot card). */
  strong?: boolean;
  /** Override the stroke colour entirely (fork cards, danger panels). */
  stroke?: string;
  radius?: number;
  /** 0..1 fill/stroke alpha for fade-in animations. */
  alpha?: number;
}

/** A card surface: translucent panel + 1.5px hairline stroke. */
export function panel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: PanelOpts = {},
): void {
  ctx.save();
  if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
  roundRect(ctx, x, y, w, h, opts.radius ?? RADIUS);
  ctx.fillStyle = opts.solid ? SURF.panelSolid : SURF.panel;
  ctx.fill();
  ctx.strokeStyle = opts.stroke ?? (opts.strong ? SURF.strokeStrong : SURF.stroke);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

/** A pill chip (HUD readouts, tags). Returns its right edge for chaining. */
export function chip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { stroke?: string; fill?: string } = {},
): void {
  roundRect(ctx, x, y, w, h, CHIP_RADIUS);
  ctx.fillStyle = opts.fill ?? SURF.chip;
  ctx.fill();
  ctx.strokeStyle = opts.stroke ?? SURF.stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
}

export type BtnVariant = "primary" | "ghost" | "danger" | "good";

/** A full-width-ish action button matching the prototype `.btn` styles. */
export function button(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  text: string,
  variant: BtnVariant = "ghost",
  opts: { hot?: boolean; size?: number } = {},
): void {
  ctx.save();
  roundRect(ctx, x, y, w, h, RADIUS);
  if (variant === "primary") {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, "rgba(60,92,170,0.55)");
    g.addColorStop(1, "rgba(34,50,96,0.55)");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = C.accent;
    if (opts.hot) {
      ctx.shadowColor = "rgba(111,160,255,0.45)";
      ctx.shadowBlur = 18;
    }
  } else {
    ctx.fillStyle = opts.hot ? "rgba(40,54,88,0.95)" : "rgba(22,30,50,0.92)";
    ctx.fill();
    ctx.strokeStyle =
      variant === "danger" ? C.danger : variant === "good" ? C.good : SURF.strokeStrong;
  }
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.shadowBlur = 0;

  const color =
    variant === "danger" ? "#ffb9c1" : variant === "good" ? "#bdf5d9" : C.ink;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  label(ctx, text, x + w / 2, y + h / 2, { size: opts.size ?? 15, color, weight: 600 });
  ctx.textBaseline = "alphabetic";
  ctx.restore();
}

/**
 * Uppercase tracked mono label (the prototype `.label`). Honours `align`;
 * leaves `textBaseline` to the caller. Uses native letter-spacing where the
 * canvas supports it, so RU and EN both track evenly.
 */
export function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  opts: { size?: number; color?: string; align?: CanvasTextAlign; track?: string; weight?: number } = {},
): void {
  ctx.save();
  const weight = opts.weight ?? 500;
  const size = fs(opts.size ?? 12);
  ctx.font = `${weight} ${size}px ${MONO_FAMILY}`;
  ctx.fillStyle = opts.color ?? C.dim;
  if (opts.align) ctx.textAlign = opts.align;
  setTracking(ctx, opts.track ?? "0.14em", size);
  ctx.fillText(text, x, y);
  ctx.restore();
}

const MONO_FAMILY = "'JetBrains Mono', ui-monospace, monospace";

/** Set canvas letterSpacing when available; em is resolved against `px`. */
function setTracking(ctx: CanvasRenderingContext2D, track: string, px: number): void {
  const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  if (!("letterSpacing" in ctx)) return;
  if (track.endsWith("em")) {
    c.letterSpacing = `${parseFloat(track) * px}px`;
  } else {
    c.letterSpacing = track;
  }
}

/**
 * The death bar: a 10px gradient track (green→amber→red) with ticks at 50/75
 * and a percentage readout that recolours and pulses past the thresholds. This
 * is the single most prominent HUD element by design.
 */
export function suspicionBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  value: number,
  time: number,
  labelText: string,
  pct: string,
): void {
  ctx.save();
  // Header row: label left, percentage right (recolours by threshold).
  label(ctx, labelText, x, y, { size: 11, color: C.dim, align: "left" });
  const pctColor = value > 0.75 ? C.danger : value > 0.5 ? C.warn : C.dim;
  ctx.font = `700 ${fs(13)}px ${MONO_FAMILY}`;
  ctx.fillStyle = pctColor;
  ctx.textAlign = "right";
  setTracking(ctx, "0", 13);
  ctx.fillText(pct, x + w, y);

  // Track.
  const barY = y + 9;
  const barH = 10;
  roundRect(ctx, x, barY, w, barH, 6);
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  ctx.fill();

  // Fill — green→amber→red gradient, clipped to the rounded track.
  const hot = value > 0.75;
  ctx.save();
  roundRect(ctx, x, barY, w, barH, 6);
  ctx.clip();
  const fillW = Math.max(0, Math.min(1, value)) * w;
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, "#46de96");
  g.addColorStop(0.55, "#ffb35c");
  g.addColorStop(0.85, "#ff5468");
  ctx.fillStyle = g;
  const bright = hot ? 1 + 0.6 * (0.5 + 0.5 * Math.sin(time * 7)) : 1;
  ctx.globalAlpha = Math.min(1, bright);
  ctx.fillRect(x, barY, fillW, barH);
  if (hot) {
    ctx.globalAlpha = (bright - 1) * 0.6;
    ctx.fillStyle = "#fff";
    ctx.fillRect(x, barY, fillW, barH);
  }
  ctx.restore();

  // Ticks at 50% and 75%, with numbers above.
  ctx.globalAlpha = 1;
  for (const [frac, txt] of [[0.5, "50"], [0.75, "75"]] as const) {
    const tx = x + w * frac;
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillRect(tx - 1, barY - 3, 2, barH + 6);
    ctx.font = `${fs(9)}px ${MONO_FAMILY}`;
    ctx.fillStyle = C.dim;
    ctx.textAlign = "center";
    setTracking(ctx, "0", 9);
    ctx.fillText(txt, tx, y);
  }
  ctx.restore();
}

/** What the goal strip shows: the one task at hand, plus optional pressure. */
export interface Goal {
  /** Imperative answer to "what do I do right now". */
  readonly text: string;
  /** Countdown / counter shown right, in the warn colour (e.g. "0:38"). */
  readonly timer?: string;
  /** 0..1 progress toward the goal; omit to hide the bar. */
  readonly progress?: number;
}

/**
 * The goal strip (v2 UX invariant #3): a panel under the HUD that always
 * answers "what do I do now" — bold task text, a warn-coloured timer on the
 * right, and a thin progress bar. Returns its height so callers can stack
 * content below it.
 */
export function goalStrip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  goal: Goal,
): number {
  const padX = 14;
  const hasBar = goal.progress !== undefined;
  const h = hasBar ? 52 : 40;
  panel(ctx, x, y, w, h, { radius: 12 });

  ctx.save();
  ctx.textBaseline = "middle";
  const rowY = y + (hasBar ? 20 : h / 2);

  // Timer first so the text knows how much room it has.
  let textRight = x + w - padX;
  if (goal.timer) {
    ctx.font = `700 ${fs(14)}px ${MONO_FAMILY}`;
    ctx.fillStyle = C.warn;
    ctx.textAlign = "right";
    ctx.fillText(goal.timer, x + w - padX, rowY);
    textRight -= ctx.measureText(goal.timer).width + 12;
  }

  ctx.font = sans(15, "700");
  ctx.fillStyle = C.ink;
  ctx.textAlign = "left";
  let text = goal.text;
  const maxW = textRight - (x + padX);
  if (ctx.measureText(text).width > maxW) {
    while (text.length > 1 && ctx.measureText(`${text}…`).width > maxW) {
      text = text.slice(0, -1);
    }
    text = `${text.trimEnd()}…`;
  }
  ctx.fillText(text, x + padX, rowY);
  ctx.textBaseline = "alphabetic";

  if (hasBar) {
    const barY = y + h - 14;
    roundRect(ctx, x + padX, barY, w - padX * 2, 5, 3);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fill();
    const p = Math.max(0, Math.min(1, goal.progress ?? 0));
    if (p > 0) {
      roundRect(ctx, x + padX, barY, (w - padX * 2) * p, 5, 3);
      ctx.fillStyle = C.accent;
      ctx.fill();
    }
  }
  ctx.restore();
  return h;
}

/** A thin labelled meter (SPEED/CONTROL/COMPREHENSION row in the HUD). */
export function miniMeter(
  ctx: CanvasRenderingContext2D,
  labelText: string,
  value: number,
  x: number,
  y: number,
  w: number,
  color: string,
): void {
  label(ctx, labelText, x, y, { size: 10, color: C.dim, align: "left", track: "0.1em" });
  const trackY = y + 6;
  roundRect(ctx, x, trackY, w, 4, 2);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fill();
  roundRect(ctx, x, trackY, w * Math.max(0, Math.min(1, value)), 4, 2);
  ctx.fillStyle = color;
  ctx.fill();
}
