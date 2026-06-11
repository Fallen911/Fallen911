import type { Dialogue } from "./Dialogue";
import type { Line } from "../data/script";
import { voiceStyle } from "./Dialogue";
import { drawReveal, wrapText } from "./text";
import { tr } from "./i18n";
import { panel, label as drawLabel } from "./theme";
import { C } from "../mechanics/util";

/** Voice-coded border colour for the dialogue panel (v2 `.dlg-line` styles). */
function voiceBorder(voice: Line["voice"]): string {
  switch (voice) {
    case "you":
      return "rgba(111,160,255,0.5)";
    case "screen":
      return "rgba(70,222,150,0.3)";
    case "god":
      return "rgba(194,164,255,0.55)";
    default:
      return "rgba(125,162,255,0.22)";
  }
}

/**
 * Render the active line of a {@link Dialogue} inside a bottom-anchored panel
 * sized to its content — text never sits on the raw background (v2 contrast
 * rule). The panel grows upward from `box.bottom`.
 */
export function renderDialogue(
  ctx: CanvasRenderingContext2D,
  dialogue: Dialogue,
  box: { x: number; y: number; width: number; bottom: number },
  time: number,
): void {
  const line = dialogue.current();
  const style = voiceStyle(line.voice);
  const padX = 18;
  const padY = 16;
  const lineHeight = 26;
  const labelH = style.label ? 22 : 0;

  // Measure to size the panel to the wrapped content.
  ctx.font = style.font;
  const lines = wrapText(ctx, line.text, box.width - padX * 2);
  const contentH = lines.length * lineHeight;
  const panelH = padY * 2 + labelH + contentH - 4;
  const panelX = box.x - 16;
  const panelW = box.width + 32;
  const panelY = box.bottom - panelH;

  panel(ctx, panelX, panelY, panelW, panelH, { stroke: voiceBorder(line.voice) });

  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  let y = panelY + padY;

  // Speaker label.
  if (style.label) {
    drawLabel(ctx, style.label, panelX + padX, y, { size: 11, color: style.color, track: "0.14em" });
    y += labelH;
  }

  // Body text with optional glow, typed in.
  ctx.font = style.font;
  ctx.fillStyle = style.color;
  if (style.glow !== "transparent") {
    ctx.shadowColor = style.glow;
    ctx.shadowBlur = 12;
  }
  drawReveal(ctx, lines, dialogue.tw.count, panelX + padX, y, lineHeight);
  ctx.shadowBlur = 0;

  // "Tap to continue" pulse once the line has fully revealed.
  if (dialogue.tw.done && !dialogue.done) {
    ctx.globalAlpha = 0.4 + 0.4 * Math.sin(time * 3);
    drawLabel(ctx, tr("дальше →", "next →"), panelX + panelW - padX, panelY - 10, {
      size: 11,
      color: C.dim,
      align: "right",
      track: "0.1em",
    });
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
  }
}
