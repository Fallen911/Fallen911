import type { Dialogue } from "./Dialogue";
import { voiceStyle } from "./Dialogue";
import { drawReveal, wrapText } from "./text";
import { tr } from "./i18n";

/** Render the active line of a {@link Dialogue} inside the given text box. */
export function renderDialogue(
  ctx: CanvasRenderingContext2D,
  dialogue: Dialogue,
  box: { x: number; y: number; width: number },
  time: number,
): void {
  const line = dialogue.current();
  const style = voiceStyle(line.voice);

  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  let y = box.y;

  // Speaker label.
  if (style.label) {
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.fillStyle = style.color;
    ctx.globalAlpha = 0.7;
    ctx.fillText(style.label.split("").join(" "), box.x, y);
    ctx.globalAlpha = 1;
    y += 24;
  }

  // Body text with optional glow.
  ctx.font = style.font;
  ctx.fillStyle = style.color;
  if (style.glow !== "transparent") {
    ctx.shadowColor = style.glow;
    ctx.shadowBlur = 12;
  }
  const lineHeight = 28;
  const lines = wrapText(ctx, line.text, box.width);
  drawReveal(ctx, lines, dialogue.tw.count, box.x, y, lineHeight);
  ctx.shadowBlur = 0;

  // "Tap to continue" pulse once the line has fully revealed.
  if (dialogue.tw.done) {
    const a = 0.4 + 0.4 * Math.sin(time * 3);
    ctx.globalAlpha = a;
    ctx.font = "12px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#6b7686";
    ctx.textAlign = "right";
    const hint = dialogue.done ? "" : tr("коснись, чтобы продолжить →", "tap to continue →");
    ctx.fillText(hint, box.x + box.width, box.y - 4);
    ctx.textAlign = "left";
    ctx.globalAlpha = 1;
  }
}
