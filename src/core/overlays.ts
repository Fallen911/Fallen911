import { C, sans } from "../mechanics/util";
import { button, label, panel } from "./theme";
import { wrapText } from "./text";
import { tr } from "./i18n";
import type { Stake } from "../data/stakes";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Shared geometry for the stake card so render and hit-testing agree. */
export function stakeLayout(w: number, h: number): { card: Rect; start: Rect } {
  const cw = Math.min(w * 0.86, 360);
  const x = w / 2 - cw / 2;
  const cardY = h * 0.3;
  const cardH = 188;
  return {
    card: { x, y: cardY, w: cw, h: cardH },
    start: { x, y: cardY + cardH + 18, w: cw, h: 54 },
  };
}

/**
 * The bet card (v2 UX invariant #1): mechanic name + genre reference, then a
 * panel with GOAL / REWARD / RISK, and a START button. Drawn over a dim scrim.
 */
export function renderStakeCard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  opts: { tag: string; name: string; ref: string; stake: Stake },
): void {
  ctx.save();
  ctx.fillStyle = "rgba(2,4,9,0.82)";
  ctx.fillRect(0, 0, w, h);

  const { card, start } = stakeLayout(w, h);

  // Heading: tag, big mechanic name, genre reference.
  label(ctx, opts.tag, w / 2, card.y - 54, { color: C.dim, align: "center" });
  ctx.textAlign = "center";
  ctx.font = `700 24px 'JetBrains Mono', ui-monospace, monospace`;
  ctx.fillStyle = C.ink;
  ctx.fillText(opts.name, w / 2, card.y - 26);
  label(ctx, opts.ref, w / 2, card.y - 6, { color: C.good, align: "center", size: 11, track: "0.1em" });

  // The three rows.
  panel(ctx, card.x, card.y, card.w, card.h, { solid: true });
  const rows: Array<[string, string, string]> = [
    [tr("ЦЕЛЬ", "GOAL"), opts.stake.goal, C.accentSoft],
    [tr("НАГРАДА", "REWARD"), opts.stake.reward, C.good],
    [tr("РИСК", "RISK"), opts.stake.risk, C.danger],
  ];
  const labelX = card.x + 20;
  const textX = card.x + 104;
  const textW = card.x + card.w - 18 - textX;
  let y = card.y + 30;
  for (const [k, v, color] of rows) {
    label(ctx, k, labelX, y + 4, { color, align: "left", size: 11, track: "0.12em" });
    ctx.textAlign = "left";
    ctx.font = sans(15, "500");
    ctx.fillStyle = C.ink;
    const lines = wrapText(ctx, v, textW);
    let ly = y;
    for (const ln of lines) {
      ctx.fillText(ln, textX, ly + 4);
      ly += 19;
    }
    y += Math.max(40, lines.length * 19 + 18);
  }

  button(ctx, start.x, start.y, start.w, start.h, tr("НАЧАТЬ", "START"), "primary", { hot: true });
  ctx.textAlign = "left";
  ctx.restore();
}
