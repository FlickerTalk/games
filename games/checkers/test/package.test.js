// What the catalogue signs for checkers: the manifest (a game, the core it needs, the live channel
// and sending, nothing else) and `dist/`, which is exactly what `src/` builds, small, and loads
// nothing from anywhere.
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildGame } from "../../../kit/build.js";
import { checkDist, checkLocales, checkManifest } from "../../../kit/test/helpers.js";
import { TEXTS } from "../src/texts.js";
import { BRANDS } from "./brands.js";

const dir = join(import.meta.dirname, "..");

describe("the checkers package", () => {
  it("says it is a game that needs the core 1.3.0, the live channel and sending, and nothing else", () => {
    const manifest = checkManifest(dir, { id: "com.flickertalk.game.checkers", name: "Checkers", component: "ft-checkers" });
    expect(manifest.version).toBe("1.0.0");
  });

  it("names and describes itself in the app's other 20 languages, the name its own title there", () => {
    const manifest = checkManifest(dir, { id: "com.flickertalk.game.checkers", name: "Checkers", component: "ft-checkers" });
    checkLocales(manifest, TEXTS, { brands: BRANDS });
  });

  it("carries in dist/ exactly what src/ builds", async () => {
    const out = mkdtempSync(join(tmpdir(), "ftgames-fck-"));
    await buildGame(dir, { outdir: out });
    expect(readFileSync(join(out, "index.js")).equals(readFileSync(join(dir, "dist", "index.js"))), "run npm run build").toBe(true);
    expect(readFileSync(join(out, "THIRD_PARTY_NOTICES.md")).equals(readFileSync(join(dir, "dist", "THIRD_PARTY_NOTICES.md")))).toBe(true);
  });

  // The cap of the other new games: with the kit's drag (2026-10-06) checkers passed the 128 KB of the small ones.
  it("stays under 160 KB, says its one third-party work is Ionicons, and loads nothing from outside", () => {
    expect(checkDist(dir, { cap: 160 * 1024 })).toBeGreaterThan(20_000);
    const notices = readFileSync(join(dir, "dist", "THIRD_PARTY_NOTICES.md"), "utf8");
    expect(notices).toContain("its one third-party work is Ionicons");
  });
});
