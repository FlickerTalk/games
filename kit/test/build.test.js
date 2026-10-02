// The build (README, "Build"): each game folder becomes the package the catalogue signs —
// `module.json` beside a `dist/` with one minified ES module (the kit compiled in, styles as text)
// and the game's third-party notices. A game whose sources did not change builds the same bytes.
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, onTestFinished } from "vitest";
import { buildGame, compactTexts, gameFolders } from "../build.js";
import { checkDist } from "./helpers.js";

const fixture = join(import.meta.dirname, "fixture");

describe("building a game", () => {
  it("makes one bundle with the kit inside, and copies the notices", async () => {
    const out = mkdtempSync(join(tmpdir(), "ftgames-"));
    await buildGame(fixture, { outdir: out });
    expect(readdirSync(out).sort()).toEqual(["THIRD_PARTY_NOTICES.md", "index.js"]);
    const code = readFileSync(join(out, "index.js"), "utf8");
    expect(code).not.toMatch(/^\s*import\s/m); // nothing left to load: the kit is inside
    expect(code).toContain("ft-fixture");
    expect(code).toContain("min-height:44px"); // the kit's stylesheet, as text
    expect(code).toContain("Waiting for the other person"); // the kit's texts
    expect(code).not.toContain("\n//"); // minified, no comments
    expect(readFileSync(join(out, "THIRD_PARTY_NOTICES.md"), "utf8")).toContain("## Ionicons");
  });

  it("builds the same bytes from the same sources", async () => {
    const one = mkdtempSync(join(tmpdir(), "ftgames-"));
    const two = mkdtempSync(join(tmpdir(), "ftgames-"));
    await buildGame(fixture, { outdir: one });
    await buildGame(fixture, { outdir: two });
    expect(readFileSync(join(one, "index.js"))).toEqual(readFileSync(join(two, "index.js")));
  });

  it("passes the checks every package must pass", async () => {
    const out = mkdtempSync(join(tmpdir(), "ftgames-"));
    await buildGame(fixture, { outdir: join(out, "dist") });
    // The kit with a toy game: the small games' cap (the kit's icons took it past 100 KB).
    expect(checkDist(out, { cap: 128 * 1024 })).toBeGreaterThan(10_000);
  });

  it("writes a texts module with each key once, and it reads back as the same texts", async () => {
    const source = join(import.meta.dirname, "..", "src", "texts.js");
    const code = await compactTexts(source);
    const { KIT_TEXTS } = await import(source);
    const compact = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
    expect(compact.KIT_TEXTS).toEqual(KIT_TEXTS);
    expect(code.split('"notOpen"').length - 1).toBe(1);
    expect(Buffer.byteLength(code)).toBeLessThan(Buffer.byteLength(JSON.stringify(KIT_TEXTS)) - 9_000);
  });

  it("refuses a texts module that holds anything but texts", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ftgames-texts-"));
    writeFileSync(join(dir, "texts.js"), 'export const T = { en: { a: "x" } };\nexport const f = () => 1;\n');
    await expect(compactTexts(join(dir, "texts.js"))).rejects.toThrow("only texts");
    writeFileSync(join(dir, "other.js"), 'export const T = { en: { a: 1 } };\n');
    await expect(compactTexts(join(dir, "other.js"))).rejects.toThrow("only texts");
  });

  it("adds the esbuild plugins a game's own build.js exports, before the kit's", async () => {
    // Inside the repository: Vitest loads modules only from there.
    const dir = mkdtempSync(join(import.meta.dirname, ".hook-"));
    onTestFinished(() => rmSync(dir, { recursive: true, force: true }));
    mkdirSync(join(dir, "src"));
    writeFileSync(join(dir, "module.json"), readFileSync(join(fixture, "module.json")));
    writeFileSync(join(dir, "THIRD_PARTY_NOTICES.md"), "None.\n");
    const kit = JSON.stringify(join(import.meta.dirname, "..", "src", "index.js"));
    const toy = JSON.stringify(join(import.meta.dirname, "toy.js"));
    writeFileSync(
      join(dir, "src", "index.js"),
      `import word from "virtual:word";\nimport { defineGame } from ${kit};\nimport { toy } from ${toy};\n` +
        'defineGame({ ...toy, tag: "ft-hooked", app: "0.0.1", texts: { en: { name: word } }, board: { mount: () => ({}) } });\n',
    );
    writeFileSync(
      join(dir, "build.js"),
      "export const plugins = [{ name: 'word', setup(build) {\n" +
        "  build.onResolve({ filter: /^virtual:word$/ }, () => ({ path: 'word', namespace: 'word' }));\n" +
        "  build.onLoad({ filter: /.*/, namespace: 'word' }, () => ({ contents: 'export default \"made-by-the-hook\";', loader: 'js' }));\n" +
        "} }];\n",
    );
    const out = mkdtempSync(join(tmpdir(), "ftgames-"));
    await buildGame(dir, { outdir: out });
    expect(readFileSync(join(out, "index.js"), "utf8")).toContain("made-by-the-hook");
    expect(readdirSync(out).sort()).toEqual(["THIRD_PARTY_NOTICES.md", "index.js"]);
  });

  it("finds every game of the repository", () => {
    const root = join(import.meta.dirname, "..", "..");
    expect(gameFolders(root).every((dir) => dir.startsWith(join(root, "games")))).toBe(true);
  });
});
