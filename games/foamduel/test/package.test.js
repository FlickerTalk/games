import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildGame } from "../../../kit/build.js";
import { checkDist, checkLocales, checkManifest } from "../../../kit/test/helpers.js";
import { BRANDS } from "../../fourinarow/test/brands.js";
import { TEXTS } from "../src/texts.js";

const dir = join(import.meta.dirname, "..");
const OTHER_GAMES = [/nidhogg/i, /divekick/i, /samurai\s*kirby/i, /quick\s*draw/i];
const NOT_TOYS = [/\bblades?\b/i, /weapon/i, /\bfight/i, /\bkill/i, /\bhurt/i, /\bwound/i];
const SAY = { id: "com.flickertalk.game.foamduel", name: "Foam Duel", component: "ft-foamduel" };

describe("the Foam Duel package", () => {
  it("says it is a game that needs the core 1.6.0, the live channel and sending, and nothing else", () => {
    expect(checkManifest(dir, SAY).version).toBe("1.0.1");
  });

  it("names and describes itself in the app's other 20 languages, for the whole family, with foam and without anyone else's game names", () => {
    const manifest = checkManifest(dir, SAY);
    checkLocales(manifest, TEXTS, { brands: [...BRANDS, ...OTHER_GAMES, /child|kid/i] });
    expect(manifest.summary).toContain("whole family");
    expect(manifest.summary).toContain("foam");
    for (const word of NOT_TOYS) expect(manifest.summary).not.toMatch(word);
  });

  it("carries in dist/ exactly what src/ builds", async () => {
    const out = mkdtempSync(join(tmpdir(), "ftgames-foamduel-"));
    await buildGame(dir, { outdir: out });
    expect(readFileSync(join(out, "index.js")).equals(readFileSync(join(dir, "dist", "index.js"))), "run npm run build").toBe(true);
    expect(readFileSync(join(out, "THIRD_PARTY_NOTICES.md")).equals(readFileSync(join(dir, "dist", "THIRD_PARTY_NOTICES.md")))).toBe(true);
  });

  it("stays under 175 KB, says its one third-party work is Ionicons, and loads nothing from outside", () => {
    expect(checkDist(dir, { cap: 175 * 1024 })).toBeGreaterThan(20_000);
    expect(readFileSync(join(dir, "dist", "THIRD_PARTY_NOTICES.md"), "utf8")).toContain("its one third-party work is Ionicons");
  });

  it("brings the kit's live bridge but not the live page nor the turn-based shell", () => {
    const code = readFileSync(join(dir, "dist", "index.js"), "utf8");
    expect(code).toContain("ft-foamduel");
    expect(code).toContain('"1.0.1"');
    expect(code).not.toContain("ftl-main");
    expect(code).not.toContain("ftg-bar");
  });
});
