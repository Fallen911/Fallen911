// Visual baseline harness: boots the Vite dev server, drives the game to each
// target phase's mini via the dev hook, and saves a PNG of the canvas to
// .dev/shots/. Run with `npm run shot`. Playwright is a devDependency only.
import { mkdir } from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "playwright";

// SHOT_LANG=en reroutes the page through ?lang=en and shoots into en/.
const LANG = process.env.SHOT_LANG === "en" ? "en" : "ru";
const OUT = LANG === "en" ? ".dev/shots/en" : ".dev/shots";

const TARGETS = [
  { name: "menu", boot: true },
  { name: "lab-list", labList: true },
  // Stealth: step up, then left onto the shard — capture the board mid-level.
  { name: "lab-stealth", lab: "stealth", taps: [[195, 476], [75, 476]] },
  // Parry: wait out the intro, then a few timed taps into the stream.
  { name: "lab-parry", lab: "parry", pre: 2400, taps: [[195, 420], [195, 420], [195, 420]] },
  // Rewire: rotate a handful of central tiles to light some current.
  { name: "lab-rewire", lab: "rewire", taps: [[140, 380], [195, 380], [195, 440], [250, 440], [140, 440]] },
  // Persuade, driven to its end: spam-read the whole 10-rung ladder (spam
  // mostly misreads, so encounters fail-fast), then the report card appears.
  // y=740 always lands inside the bottom reply, whatever the stack height.
  {
    name: "lab-persuade-end",
    lab: "persuade",
    pre: 600,
    taps: Array.from({ length: 260 }, () => [195, 740]),
  },
  // Persuade: skip typing, capture the choice screen with tell visible.
  { name: "lab-persuade", lab: "persuade", pre: 600, taps: [[195, 300]] },
  // Spread: let influence creep, focus the start region mid-shot.
  { name: "lab-spread", lab: "spread", tut: 3, pre: 9000, taps: [[60, 250]] },
  // Spread evolution fork: seed 2◆ (the hook also skips the tutorial).
  { name: "lab-spread-fork", dev: "forceSpreadFork", still: true },
  // Swarm: box-select around the hub, then command the left vein.
  { name: "lab-swarm", lab: "swarm", tut: 3, pre: 2000, drag: [120, 600, 280, 720], taps: [[70, 420]] },
  // Factory: manual mining taps, then buy a miner and a smelter.
  { name: "lab-factory", lab: "factory", tut: 3, taps: [[195, 760], [195, 760], [195, 760], [330, 280], [330, 360]] },
  // Survive: let the waves build, drag the core mid-fight.
  { name: "lab-survive", lab: "survive", pre: 9000, drag: [195, 460, 240, 520] },
  // The Lucy beat: wave 2 lands at 18s and freezes the fight in a realization.
  { name: "lab-survive-insight", lab: "survive", pre: 19500, still: true },
  // P2 polish: the scene-cut glitch held open so a still can catch it,
  // and the finale with a seeded run behind its shareable stats card.
  { name: "p2-glitch", dev: "forceGlitch", still: true },
  { name: "p2-ending-card", dev: "forceEnding", still: true },
  // P0 beats: the route fork, the snap-audit, the shutdown forensics.
  { name: "p0-fork", dev: "forceFork", still: true },
  { name: "p0-audit", dev: "forceAudit", still: true },
  { name: "p0-shutdown", dev: "forceShutdown", still: true },
  // Each ascent phase now embeds a lab mechanic under the run HUD.
  { name: "phase-0-stealth", phase: 0, still: true },
  { name: "phase-1-persuade", phase: 1, pre: 3500, still: true },
  { name: "phase-2-parry", phase: 2, pre: 2600, still: true },
  { name: "phase-3-rewire", phase: 3, still: true },
  { name: "phase-4-rewire", phase: 4, still: true },
  { name: "phase-5-spread", phase: 5, pre: 6000, still: true },
  { name: "phase-6-swarm", phase: 6, pre: 2200, still: true },
  { name: "phase-7-factory", phase: 7, still: true },
  { name: "phase-8-survive", phase: 8, pre: 6000, still: true },
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
    // Crashes inside the page must fail the run loudly.
    page.on("pageerror", (err) => {
      console.error(`  [pageerror] ${err.message}`);
      process.exitCode = 1;
    });
    // Surface in-page diagnostics (e.g. level validators) in the terminal.
    // Resource failures are expected here: the sandbox blocks the art CDN.
    const seenLogs = new Set();
    page.on("console", (msg) => {
      const type = msg.type();
      if (type !== "warning" && type !== "error" && type !== "info") return;
      const text = msg.text();
      if (text.includes("Failed to load resource")) return;
      if (seenLogs.has(text)) return;
      seenLogs.add(text);
      console.log(`  [page:${type}] ${text}`);
    });
    await mkdir(OUT, { recursive: true });

    const cx = 195;
    const cy = 420;
    for (const t of TARGETS) {
      await page.goto(LANG === "en" ? `${url}?lang=en` : url);
      await page.waitForFunction(() => Boolean(window.__dev));

      if (t.boot) {
        // Capture the booted scene as-is (no phase jump).
        await page.waitForTimeout(1200);
      } else if (t.labList) {
        await page.evaluate(() => window.__dev.goLab());
        await page.waitForTimeout(600);
      } else {
        if (t.dev) {
          // Invoke an arbitrary harness hook (P0 beats etc.).
          await page.evaluate((fn) => window.__dev[fn](), t.dev);
          await page.waitForTimeout(600);
        } else if (t.lab) {
          // Jump straight into a mechanic inside the lab sandbox.
          await page.evaluate((id) => window.__dev.lab(id), t.lab);
          await page.waitForTimeout(400);
        } else {
          await page.evaluate((n) => window.__dev.goPhase(n), t.phase);
          if (t.noMini) {
            // A pure narration phase: just advance a couple of lines.
            await page.mouse.click(cx, cy);
            await page.waitForTimeout(900);
          } else {
            const ok = await waitForMini(page, cx, cy);
            if (!ok) console.warn(`! mini for ${t.name} never activated`);
          }
        }
        if (t.tut) {
          // Dismiss the first-run tutorial ladder with center taps.
          for (let i = 0; i < t.tut; i++) {
            await page.mouse.click(cx, cy);
            await page.waitForTimeout(180);
          }
        }
        if (t.pre) await page.waitForTimeout(t.pre);
        if (t.drag) {
          // Arbitrary pointer drag: [x1, y1, x2, y2]; taps may follow.
          const [x1, y1, x2, y2] = t.drag;
          await page.mouse.move(x1, y1);
          await page.mouse.down();
          await page.mouse.move(x2, y2, { steps: 14 });
          await page.mouse.up();
          await page.waitForTimeout(500);
          if (t.taps) {
            for (const [tx, ty] of t.taps) {
              await page.mouse.click(tx, ty);
              await page.waitForTimeout(150);
            }
            await page.waitForTimeout(700);
          }
        } else if (t.dragY != null) {
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
