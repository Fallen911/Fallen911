/**
 * Thin wrapper around the HTML overlay layer (`#ui`). Canvas is great for the
 * game world, but text entry is far better handled by a real DOM element.
 * There is deliberately no "set raw HTML" helper: a scene that needs DOM should
 * build nodes and fill them via `textContent`, so player or localised text can
 * never be parsed as markup.
 */
export class UIOverlay {
  constructor(readonly root: HTMLElement) {}

  clear(): void {
    this.root.replaceChildren();
  }

  /** Typed query inside the overlay. */
  query<T extends HTMLElement>(selector: string): T | null {
    return this.root.querySelector<T>(selector);
  }
}
