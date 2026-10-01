// The build (README, "Build"): each game folder becomes the package the catalogue signs —
// `module.json` beside a `dist/` with one minified ES module (the kit compiled in, styles as text)
// and the game's third-party notices. A game whose sources did not change builds the same bytes.
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildGame, gameFolders } from "../build.js";
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
    expect(readFileSync(join(out, "THIRD_PARTY_NOTICES.md"), "utf8")).toContain("no third-party code");
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
    expect(checkDist(out, { cap: 100 * 1024 })).toBeGreaterThan(10_000);
  });

  it("finds every game of the repository", () => {
    const root = join(import.meta.dirname, "..", "..");
    expect(gameFolders(root).every((dir) => dir.startsWith(join(root, "games")))).toBe(true);
  });
});
