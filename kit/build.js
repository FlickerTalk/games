// How a game folder becomes the package the catalogue signs (README, "Build"): `module.json`
// beside a `dist/` with one minified ES module — the game, the kit compiled in, the styles as
// text — and the game's THIRD_PARTY_NOTICES.md (esbuild drops licence comments from the bundle,
// so the notices travel beside it). esbuild's output depends only on the sources: a game whose
// sources and kit did not change builds the same bytes, and `git diff dist/` says which changed.

import { build, transform } from "esbuild";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const NOTICES = "THIRD_PARTY_NOTICES.md";

/** A stylesheet goes in as text, minified by esbuild's own CSS minifier. */
const cssAsText = {
  name: "css-as-text",
  setup(builder) {
    builder.onLoad({ filter: /\.css$/ }, async ({ path }) => {
      const { code } = await transform(readFileSync(path, "utf8"), { loader: "css", minify: true });
      return { contents: code.trim(), loader: "text" };
    });
  },
};

/** Builds the game in `dir` into `outdir` (its `dist/` unless told otherwise). */
export async function buildGame(dir, { outdir = join(dir, "dist") } = {}) {
  rmSync(outdir, { recursive: true, force: true });
  mkdirSync(outdir, { recursive: true });
  await build({
    entryPoints: [join(dir, "src", "index.js")],
    bundle: true,
    format: "esm",
    minify: true,
    target: ["es2022"],
    charset: "utf8",
    outfile: join(outdir, "index.js"),
    plugins: [cssAsText],
    legalComments: "none",
    logLevel: "warning",
  });
  if (!existsSync(join(dir, NOTICES))) throw new Error(`${dir} has no ${NOTICES}`);
  copyFileSync(join(dir, NOTICES), join(outdir, NOTICES));
}

/** Every game of the repository: the folders of `games/` that hold a `module.json`. */
export function gameFolders(root) {
  const games = join(root, "games");
  if (!existsSync(games)) return [];
  return readdirSync(games)
    .map((name) => join(games, name))
    .filter((dir) => existsSync(join(dir, "module.json")))
    .sort();
}
