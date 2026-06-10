// Renders the app icon (the machine's eye) with canvas code and saves PNGs
// for the PWA/home-screen and as a base for the Xcode asset catalog.
// Run: node scripts/make-icon.mjs  →  public/icons/*.png
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const SIZES = [1024, 512, 180, 64];
const OUT = "public/icons";

const PAGE = `<!doctype html><meta charset="utf-8">
<body style="margin:0"><canvas id="c"></canvas><script>
function draw(S) {
  const c = document.getElementById("c");
  c.width = S; c.height = S;
  const x = c.getContext("2d");
  const u = S / 1024; // design units

  // Deep void with a faint blue well.
  x.fillStyle = "#05060a";
  x.fillRect(0, 0, S, S);
  let g = x.createRadialGradient(S/2, S/2, S*0.05, S/2, S/2, S*0.75);
  g.addColorStop(0, "rgba(28,38,70,0.9)");
  g.addColorStop(1, "rgba(5,6,10,1)");
  x.fillStyle = g;
  x.fillRect(0, 0, S, S);

  const cx = S/2, cy = S/2, R = 300*u;

  // Glitch double-print of the eye outline.
  for (const [dx, col] of [[10*u, "rgba(255,77,94,0.55)"], [-10*u, "rgba(122,162,255,0.55)"]]) {
    x.strokeStyle = col;
    x.lineWidth = 7*u;
    x.beginPath();
    x.moveTo(cx - R*1.55 + dx, cy);
    x.quadraticCurveTo(cx + dx, cy - R*1.05, cx + R*1.55 + dx, cy);
    x.quadraticCurveTo(cx + dx, cy + R*1.05, cx - R*1.55 + dx, cy);
    x.stroke();
  }

  // Eye body.
  x.fillStyle = "#02030a";
  x.strokeStyle = "rgba(159,192,255,0.95)";
  x.lineWidth = 10*u;
  x.beginPath();
  x.moveTo(cx - R*1.55, cy);
  x.quadraticCurveTo(cx, cy - R*1.05, cx + R*1.55, cy);
  x.quadraticCurveTo(cx, cy + R*1.05, cx - R*1.55, cy);
  x.closePath();
  x.fill();
  x.stroke();

  // Iris.
  g = x.createRadialGradient(cx, cy, 2, cx, cy, R*0.78);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.22, "#9fc0ff");
  g.addColorStop(0.6, "rgba(122,162,255,0.55)");
  g.addColorStop(1, "rgba(122,162,255,0.04)");
  x.fillStyle = g;
  x.beginPath();
  x.arc(cx, cy, R*0.72, 0, Math.PI*2);
  x.fill();

  // Slit pupil.
  x.fillStyle = "#01020a";
  x.beginPath();
  x.ellipse(cx, cy, R*0.13, R*0.5, 0, 0, Math.PI*2);
  x.fill();

  // Scanlines clipped to the eye.
  x.save();
  x.beginPath();
  x.moveTo(cx - R*1.55, cy);
  x.quadraticCurveTo(cx, cy - R*1.05, cx + R*1.55, cy);
  x.quadraticCurveTo(cx, cy + R*1.05, cx - R*1.55, cy);
  x.clip();
  x.fillStyle = "rgba(5,8,18,0.42)";
  for (let yy = cy - R*1.1; yy < cy + R*1.1; yy += 14*u) x.fillRect(0, yy, S, 5*u);
  x.restore();

  // Corner ticks — diagnostics chrome.
  x.strokeStyle = "rgba(122,162,255,0.5)";
  x.lineWidth = 6*u;
  const t = 70*u, m = 86*u;
  for (const [sx, sy] of [[m, m], [S-m, m], [m, S-m], [S-m, S-m]]) {
    x.beginPath();
    x.moveTo(sx + (sx < S/2 ? t : -t), sy);
    x.lineTo(sx, sy);
    x.lineTo(sx, sy + (sy < S/2 ? t : -t));
    x.stroke();
  }
}
window.draw = draw;
</script>`;

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.PW_CHROMIUM_PATH || undefined,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({ viewport: { width: 1100, height: 1100 } });
  await page.setContent(PAGE);
  for (const size of SIZES) {
    await page.evaluate((s) => window.draw(s), size);
    const name =
      size === 180 ? "apple-touch-icon.png" : size === 64 ? "favicon.png" : `icon-${size}.png`;
    await page.locator("#c").screenshot({ path: `${OUT}/${name}` });
    console.log(`✓ ${OUT}/${name}`);
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
