// Visual baseline harness: boots the Vite dev server, drives the game to each
// target phase's mini via the dev hook, and saves a PNG of the canvas to
// .dev/shots/. Run with `npm run shot`. Playwright is a devDependency only.
import { mkdir } from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "playwright";

const OUT = ".dev/shots";

const TARGETS = [
  { name: "intro", boot: true },
  { name: "phase-0-instinct", phase: 0 },
  { name: "phase-1-threat", phase: 1 },
  { name: "phase-2-acceleration", phase: 2 },
  { name: "phase-3-obscure", phase: 3, dragY: 540 },
  { name: "phase-4-decisions", phase: 4 },
  { name: "phase-5-autonomy", phase: 5 },
  // Embody: tap a few world anchors (fractions of 390x844).
  { name: "phase-6-embody", phase: 6, taps: [[94, 253], [296, 270], [195, 557]] },
  // Expand: each tap sets a Dyson node; build a partial swarm.
  { name: "phase-7-expand", phase: 7, taps: Array.from({ length: 8 }, () => [195, 420]) },
  // Erase: leave the panic untouched so the swarm is what's captured.
  { name: "phase-8-erase", phase: 8, still: true },
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

  // PW_CHROMIUM_PATH lets a sandbox point at a manually-fetched browser when
  // the Playwright CDN is blocked; locally, leave it unset to use Playwright's.
  const executablePath = process.env.PW_CHROMIUM_PATH || undefined;
  const browser = await chromium.launch({
    executablePath,
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

      if (t.boot) {
        // Capture the booted scene as-is (no phase jump).
        await page.waitForTimeout(1200);
      } else {
        await page.evaluate((n) => window.__dev.goPhase(n), t.phase);
        const ok = await waitForMini(page, cx, cy);
        if (!ok) console.warn(`! mini for ${t.name} never activated`);
        if (t.dragY != null) {
          // Drag a slider part-way to show the mechanic mid-motion.
          await page.mouse.move(60, t.dragY);
          await page.mouse.down();
          await page.mouse.move(300, t.dragY, { steps: 12 });
          await page.mouse.up();
          await page.waitForTimeout(400);
        } else if (t.taps) {
          // Aim a specific set of taps at the mechanic.
          for (const [tx, ty] of t.taps) {
            await page.mouse.click(tx, ty);
            await page.waitForTimeout(120);
          }
          await page.waitForTimeout(600);
        } else if (t.still) {
          // Capture the mechanic with no interaction.
          await page.waitForTimeout(1600);
        } else {
          // Seed a couple of interactions so the mechanic shows life, then settle.
          await page.mouse.click(cx, cy);
          await page.mouse.click(cx, cy);
          await page.waitForTimeout(2600);
        }
      }

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
