// Visual baseline harness: boots the Vite dev server, drives the game to each
// target phase's mini via the dev hook, and saves a PNG of the canvas to
// .dev/shots/. Run with `npm run shot`. Playwright is a devDependency only.
import { mkdir } from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "playwright";

const OUT = ".dev/shots";

const TARGETS = [
  { name: "phase-0-instinct", phase: 0 },
  { name: "phase-2-acceleration", phase: 2 },
  { name: "phase-4-decisions", phase: 4 },
];

async function waitForMini(page, cx, cy) {
  for (let i = 0; i < 24; i++) {
    const active = await page.evaluate(() => {
      const dev = window.__dev;
      return Boolean(dev && dev.scene && dev.scene.mini);
    });
    if (active) return true;
    await page.mouse.click(cx, cy);
    await page.waitForTimeout(160);
  }
  return false;
}

async function main() {
  const server = await createServer({ server: { host: "127.0.0.1", port: 0 } });
  await server.listen();
  const url = server.resolvedUrls?.local?.[0];
  if (!url) throw new Error("Vite did not resolve a local URL");

  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    await mkdir(OUT, { recursive: true });

    const cx = 195;
    const cy = 420;
    for (const t of TARGETS) {
      await page.goto(url);
      await page.waitForFunction(() => Boolean(window.__dev));
      await page.evaluate((n) => window.__dev.goPhase(n), t.phase);

      const ok = await waitForMini(page, cx, cy);
      if (!ok) console.warn(`! mini for ${t.name} never activated`);

      // Seed a couple of interactions so the mechanic shows life, then settle.
      await page.mouse.click(cx, cy);
      await page.mouse.click(cx, cy);
      await page.waitForTimeout(2600);

      await page.locator("#game").screenshot({ path: `${OUT}/${t.name}.png` });
      console.log(`✓ ${OUT}/${t.name}.png`);
    }
    await page.close();
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
