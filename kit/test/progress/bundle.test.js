import { build } from "esbuild";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { gameFolders } from "../../build.js";

const root = join(import.meta.dirname, "..", "..", "..");
const progress = join(root, "kit", "src", "progress", "index.js");
const MARK = "a game's progress is declared as an object";

async function bundled(contents) {
  const out = await build({
    stdin: { contents, resolveDir: root, loader: "js" },
    bundle: true,
    format: "esm",
    minify: true,
    target: ["es2022"],
    write: false,
    legalComments: "none",
  });
  return out.outputFiles[0].text;
}

function importsProgress(dir) {
  const src = join(dir, "src");
  return existsSync(src) && readdirSync(src, { recursive: true }).some((file) => /\.js$/.test(file) && /progress\/index\.js/.test(readFileSync(join(src, file), "utf8")));
}

describe("the progress module in a game's package", () => {
  it("is compiled only into a game that imports it", () => {
    const games = gameFolders(root);
    expect(games.length).toBeGreaterThan(0);
    for (const dir of games.filter((one) => !importsProgress(one))) {
      expect(readFileSync(join(dir, "dist", "index.js"), "utf8").includes(MARK), dir).toBe(false);
    }
  });

  it("adds under 9 KB to a game that uses all of it", async () => {
    const code = await bundled(`export * from ${JSON.stringify(progress)};`);
    expect(code).toContain(MARK);
    expect(Buffer.byteLength(code)).toBeLessThan(9 * 1024);
  });

  it("adds well under 1 KB to a game that takes only the length of a round", async () => {
    const code = await bundled(`import { roundSeconds } from ${JSON.stringify(progress)};\nexport default roundSeconds;`);
    expect(code).not.toContain(MARK);
    expect(Buffer.byteLength(code)).toBeLessThan(512);
  });
});
