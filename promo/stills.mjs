import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
const [id, out, ...frames] = process.argv.slice(2);
const browserExecutable = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id, browserExecutable });
for (const f of frames) {
  await renderStill({ serveUrl, composition, frame: Number(f), output: `${out}/${id}-${String(f).padStart(3, "0")}.png`, browserExecutable, scale: 0.5 });
}
console.log("done");
