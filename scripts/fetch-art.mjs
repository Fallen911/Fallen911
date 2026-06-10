// One-time art bundler for offline/iOS builds. Run on a machine that can
// reach the art CDN (any dev laptop):
//
//   node scripts/fetch-art.mjs
//
// Downloads every backdrop referenced in src/data/backdrops.ts into
// public/bg/<key>_<p|l>.webp and rewrites the data file to the local paths.
// Idempotent: already-local entries are skipped. Commit the binaries after.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA = "src/data/backdrops.ts";
const OUT_DIR = "public/bg";

async function main() {
  let src = await readFile(DATA, "utf8");
  await mkdir(OUT_DIR, { recursive: true });

  // Match `key: { p: `...`, l: `...` }` blocks built from the CDN template.
  const entryRe = /(\w+):\s*{\s*p:\s*`\$\{CDN\}\/([^`]+)`(?:,\s*l:\s*`\$\{CDN\}\/([^`]+)`)?/g;
  const cdnMatch = src.match(/const CDN = "([^"]+)"/);
  if (!cdnMatch) {
    console.log("Nothing to do: no CDN base found (already localized?)");
    return;
  }
  const cdn = cdnMatch[1];

  const jobs = [];
  for (const m of src.matchAll(entryRe)) {
    const [, key, pFile, lFile] = m;
    jobs.push({ key, slot: "p", file: pFile });
    if (lFile) jobs.push({ key, slot: "l", file: lFile });
  }
  if (jobs.length === 0) {
    console.log("Nothing to do: no remote entries found.");
    return;
  }

  for (const j of jobs) {
    const url = `${cdn}/${j.file}`;
    const local = `${j.key}_${j.slot}.webp`;
    const target = path.join(OUT_DIR, local);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(target, buf);
    console.log(`✓ ${local} (${(buf.length / 1024).toFixed(0)} KB)`);
    src = src.replaceAll(`\`\${CDN}/${j.file}\``, `\`\${BASE}/${local}\``);
  }

  src = src.replace(
    /const CDN = "[^"]+";/,
    `// Bundled locally by scripts/fetch-art.mjs — the game runs fully offline.\nconst BASE = "bg";`,
  );
  await writeFile(DATA, src);
  console.log(`\nDone: ${jobs.length} files in ${OUT_DIR}, ${DATA} now points at local paths.`);
  console.log("Re-run npm run build && npx cap sync ios to bundle them into the app.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
