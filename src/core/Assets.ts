/**
 * Tiny image cache. Backgrounds are loaded once and drawn under the canvas
 * art; until an image is ready, getters return null and scenes fall back to
 * their code-drawn look, so nothing ever blocks on a missing asset.
 */
export class Assets {
  private cache = new Map<string, HTMLImageElement>();
  private ready = new Set<string>();

  load(key: string, url: string): void {
    if (this.cache.has(key)) return;
    const img = new Image();
    img.onload = () => this.ready.add(key);
    img.src = url;
    this.cache.set(key, img);
  }

  /** The image if it has finished loading, otherwise null. */
  get(key: string): HTMLImageElement | null {
    return this.ready.has(key) ? this.cache.get(key) ?? null : null;
  }
}
