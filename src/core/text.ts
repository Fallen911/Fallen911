/** Word-wrap `text` to `maxWidth` using the context's current font. */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (paragraph === "") {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of paragraph.split(" ")) {
      const test = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(test).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

/**
 * A character-by-character reveal driven by elapsed time. The scene wraps the
 * full string into lines once (so wrapping never reflows mid-reveal) and asks
 * the typewriter how many characters are currently visible.
 */
export class Typewriter {
  private full = "";
  private revealed = 0;
  /** Characters per second. */
  speed = 42;

  setText(text: string): void {
    this.full = text;
    this.revealed = 0;
  }

  update(dt: number): void {
    if (this.revealed < this.full.length) {
      this.revealed = Math.min(this.full.length, this.revealed + this.speed * dt);
    }
  }

  /** Jump straight to the end (player tapped while text was still typing). */
  skip(): void {
    this.revealed = this.full.length;
  }

  get done(): boolean {
    return this.revealed >= this.full.length;
  }

  get count(): number {
    return Math.floor(this.revealed);
  }
}

/**
 * Draw pre-wrapped lines but only reveal the first `count` characters across
 * them. Returns the y just below the last drawn line.
 */
export function drawReveal(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  count: number,
  x: number,
  y: number,
  lineHeight: number,
): number {
  let remaining = count;
  for (const line of lines) {
    if (remaining <= 0) {
      y += lineHeight;
      continue;
    }
    ctx.fillText(line.slice(0, remaining), x, y);
    remaining -= line.length + 1; // account for the join between lines
    y += lineHeight;
  }
  return y;
}
