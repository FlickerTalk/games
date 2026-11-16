import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildGame } from "../../../kit/build.js";
import { checkDist, checkLocales, checkManifest } from "../../../kit/test/helpers.js";
import { TEXTS } from "../src/texts.js";
import { BRANDS } from "./brands.js";

const dir = join(import.meta.dirname, "..");

describe("the Crazy Eights package", () => {
  it("says it is a game that needs the core 1.6.0, the live channel and sending, and nothing else", () => {
    const manifest = checkManifest(dir, { id: "com.flickertalk.game.eights", name: "Crazy Eights", component: "ft-eights" });
    expect(manifest.version).toBe("1.2.0");
    for (const brand of BRANDS) expect(`${manifest.name} ${manifest.summary}`).not.toMatch(brand);
  });

  it("names and describes itself in the app's other 20 languages, the name its own title there", () => {
    const manifest = checkManifest(dir, { id: "com.flickertalk.game.eights", name: "Crazy Eights", component: "ft-eights" });
    checkLocales(manifest, TEXTS, { brands: BRANDS });
  });

  it("carries in dist/ exactly what src/ builds", async () => {
    const out = mkdtempSync(join(tmpdir(), "ftgames-fce-"));
    await buildGame(dir, { outdir: out });
    expect(readFileSync(join(out, "index.js")).equals(readFileSync(join(dir, "dist", "index.js"))), "run npm run build").toBe(true);
    expect(readFileSync(join(out, "THIRD_PARTY_NOTICES.md")).equals(readFileSync(join(dir, "dist", "THIRD_PARTY_NOTICES.md")))).toBe(true);
  });

  it("stays under 310 KB, names its third-party works, Ionicons and the deck of playing cards, loads nothing from outside and names no brand", () => {
    expect(checkDist(dir, { cap: 310 * 1024 })).toBeGreaterThan(20_000);
    const notices = readFileSync(join(dir, "dist", "THIRD_PARTY_NOTICES.md"), "utf8");
    expect(notices).toContain("its third-party works are Ionicons and Adrian Kennard's playing cards");
    expect(notices).toMatch(/## Playing cards by Adrian Kennard[\s\S]*Licence: CC0 1\.0/);
    const code = readFileSync(join(dir, "dist", "index.js"), "utf8");
    for (const brand of BRANDS) expect(`${code}\n${notices}`).not.toMatch(brand);
  });
});
