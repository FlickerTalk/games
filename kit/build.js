// How a game folder becomes the package the catalogue signs (README, "Build"): `module.json`
// beside a `dist/` with one minified ES module — the game, the kit compiled in, the styles as
// text — and the game's THIRD_PARTY_NOTICES.md (esbuild drops licence comments from the bundle,
// so the notices travel beside it). esbuild's output depends only on the sources: a game whose
// sources and kit did not change builds the same bytes, and `git diff dist/` says which changed.

import { build, transform } from "esbuild";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

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

/**
 * A texts module (`export const NAME = { lang: { key: text } }` and nothing else) written for the
 * bundle with each key once: the 21 languages would otherwise repeat every key 21 times. It
 * builds the same objects when it loads. Anything that is not texts stops the build.
 */
export async function compactTexts(path) {
  // Read as it is, on its own: a texts module imports nothing.
  const module = await import(`data:text/javascript;base64,${readFileSync(path).toString("base64")}`);
  const refuse = () => {
    throw new Error(`${path} must hold only texts: { lang: { key: "text" } }`);
  };
  let code = "const z=(k,v)=>Object.fromEntries(k.map((key,at)=>[key,v[at]]).filter(([,text])=>text!==null));\n";
  for (const [name, catalogue] of Object.entries(module)) {
    if (!catalogue || typeof catalogue !== "object" || Array.isArray(catalogue)) refuse();
    const keys = [];
    for (const texts of Object.values(catalogue)) {
      if (!texts || typeof texts !== "object" || Array.isArray(texts)) refuse();
      for (const [key, text] of Object.entries(texts)) {
        if (typeof text !== "string") refuse();
        if (!keys.includes(key)) keys.push(key);
      }
    }
    const languages = Object.entries(catalogue).map(([lang, texts]) => `${JSON.stringify(lang)}:z(k,${JSON.stringify(keys.map((key) => texts[key] ?? null))})`);
    code += `export const ${name}=(()=>{const k=${JSON.stringify(keys)};return{${languages.join(",")}}})();\n`;
  }
  return code;
}

/** Texts modules go in with each key once (`compactTexts`). */
const textsOnce = {
  name: "texts-once",
  setup(builder) {
    builder.onLoad({ filter: /[\\/]texts\.js$/ }, async ({ path }) => ({ contents: await compactTexts(path), loader: "js" }));
  },
};

/** What a game adds to its own build: the esbuild `plugins` its `build.js` exports, if it has one. */
async function ownPlugins(dir) {
  const hook = join(dir, "build.js");
  if (!existsSync(hook)) return [];
  return (await import(pathToFileURL(hook).href)).plugins ?? [];
}

/** Builds the game in `dir` into `outdir` (its `dist/` unless told otherwise). */
export async function buildGame(dir, { outdir = join(dir, "dist") } = {}) {
  const plugins = await ownPlugins(dir);
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
    plugins: [...plugins, cssAsText, textsOnce],
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
