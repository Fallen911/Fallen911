/**
 * Thin wrapper around the HTML overlay layer (`#ui`). Canvas is great for the
 * game world, but text entry (asking the AI a question) is far better handled
 * by a real DOM element, so scenes can inject HTML on top of the canvas.
 */
export class UIOverlay {
  constructor(readonly root: HTMLElement) {}

  /** Replace overlay contents with the given HTML and return the root. */
  show(html: string): HTMLElement {
    this.root.innerHTML = html;
    return this.root;
  }

  clear(): void {
    this.root.innerHTML = "";
  }

  /** Typed query inside the overlay. */
  query<T extends HTMLElement>(selector: string): T | null {
    return this.root.querySelector<T>(selector);
  }
}
