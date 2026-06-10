import type { Assets } from "./Assets";

/**
 * Pick the orientation-appropriate variant of a backdrop: `${key}:l` holds the
 * landscape render for wide screens, `key` the portrait one. Falls back to
 * whichever is loaded so the player never stares at a void mid-load.
 */
export function pickBackdrop(
  assets: Assets,
  key: string,
  w: number,
  h: number,
): HTMLImageElement | null {
  if (w > h) return assets.get(`${key}:l`) ?? assets.get(key);
  return assets.get(key) ?? assets.get(`${key}:l`);
}

/**
 * Draw a generated background image adapted for the game: cover-fit with a slow
 * ken-burns drift, a dark gradient so text stays legible, and a vignette to
 * pull focus inward. Scenes layer their code-art and UI on top.
 */
export function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
  time: number,
  opacity = 1,
): void {
  const iw = img.naturalWidth || w;
  const ih = img.naturalHeight || h;
  const scale = (1.08 + 0.04 * Math.sin(time * 0.05)) * Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (w - dw) / 2 + Math.sin(time * 0.03) * w * 0.02;
  const dy = (h - dh) / 2 + Math.cos(time * 0.04) * h * 0.02;

  ctx.globalAlpha = opacity;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.globalAlpha = 1;

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "rgba(4,5,10,0.5)");
  grad.addColorStop(0.5, "rgba(4,5,10,0.3)");
  grad.addColorStop(1, "rgba(4,5,10,0.86)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const vignette = ctx.createRadialGradient(
    w / 2,
    h / 2,
    Math.min(w, h) * 0.32,
    w / 2,
    h / 2,
    Math.max(w, h) * 0.78,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}
