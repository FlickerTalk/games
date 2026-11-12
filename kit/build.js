import { build, transform } from "esbuild";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const NOTICES = "THIRD_PARTY_NOTICES.md";

const cssAsText = {
  name: "css-as-text",
  setup(builder) {
    builder.onLoad({ filter: /\.css$/ }, async ({ path }) => {
      const { code } = await transform(readFileSync(path, "utf8"), { loader: "css", minify: true });
      return { contents: code.trim(), loader: "text" };
    });
  },
};

/** Each key once in the bundle, the 21 languages would otherwise repeat every key 21 times. */
export async function compactTexts(path) {
  // importing from a data: URL works because a texts module imports nothing
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

const textsOnce = {
  name: "texts-once",
  setup(builder) {
    builder.onLoad({ filter: /[\\/]texts\.js$/ }, async ({ path }) => ({ contents: await compactTexts(path), loader: "js" }));
  },
};

async function ownPlugins(dir) {
  const hook = join(dir, "build.js");
  if (!existsSync(hook)) return [];
  return (await import(pathToFileURL(hook).href)).plugins ?? [];
}

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

export function gameFolders(root) {
  const games = join(root, "games");
  if (!existsSync(games)) return [];
  return readdirSync(games)
    .map((name) => join(games, name))
    .filter((dir) => existsSync(join(dir, "module.json")))
    .sort();
}
