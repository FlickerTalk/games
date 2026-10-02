// `npm run build`: rebuilds the `dist/` of every game (or of the ones named: `node build.js chess`)
// from its sources and the kit. Commit what changes in `dist/`: it is what the catalogue signs.
import { statSync } from "node:fs";
import { basename, join } from "node:path";
import { buildGame, gameFolders } from "./kit/build.js";

const root = import.meta.dirname;
const wanted = process.argv.slice(2);
for (const dir of gameFolders(root)) {
  if (wanted.length && !wanted.includes(basename(dir))) continue;
  await buildGame(dir);
  const size = statSync(join(dir, "dist", "index.js")).size;
  console.log(`${basename(dir)}: dist/index.js ${(size / 1024).toFixed(1)} KB`);
}
