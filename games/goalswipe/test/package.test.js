import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildGame } from "../../../kit/build.js";
import { checkDist, checkLocales, checkManifest } from "../../../kit/test/helpers.js";
import { BRANDS } from "../../fourinarow/test/brands.js";
import { TEXTS } from "../src/texts.js";

const dir = join(import.meta.dirname, "..");
const FOOTBALL_GAMES = [/\bfifa\b/i, /\bpes\b/i, /score!?\s*hero/i, /flick\s*(kick|shoot|soccer)/i, /head\s*soccer/i, /penalty\s*shooters/i];
const SAY = { id: "com.flickertalk.game.goalswipe", name: "Goal Swipe", component: "ft-goalswipe" };

describe("the Goal Swipe package", () => {
  it("says it is a game that needs the core 1.6.0, the live channel and sending, and nothing else", () => {
    expect(checkManifest(dir, SAY).version).toBe("1.0.0");
  });

  it("names and describes itself in the app's other 20 languages, for the whole family and without anyone else's game names", () => {
    const manifest = checkManifest(dir, SAY);
    checkLocales(manifest, TEXTS, { brands: [...BRANDS, ...FOOTBALL_GAMES, /child|kid/i] });
    expect(manifest.summary).toContain("whole family");
    expect(manifest.summary).not.toMatch(/child|kid/i);
  });

  it("carries in dist/ exactly what src/ builds", async () => {
    const out = mkdtempSync(join(tmpdir(), "ftgames-goalswipe-"));
    await buildGame(dir, { outdir: out });
    expect(readFileSync(join(out, "index.js")).equals(readFileSync(join(dir, "dist", "index.js"))), "run npm run build").toBe(true);
    expect(readFileSync(join(out, "THIRD_PARTY_NOTICES.md")).equals(readFileSync(join(dir, "dist", "THIRD_PARTY_NOTICES.md")))).toBe(true);
  });

  it("stays under 200 KB, says its one third-party work is Ionicons, and loads nothing from outside", () => {
    expect(checkDist(dir, { cap: 200 * 1024 })).toBeGreaterThan(20_000);
    expect(readFileSync(join(dir, "dist", "THIRD_PARTY_NOTICES.md"), "utf8")).toContain("its one third-party work is Ionicons");
  });

  it("brings the kit's turn-based table for the two phones, but neither its page nor the real-time part", () => {
    const code = readFileSync(join(dir, "dist", "index.js"), "utf8");
    expect(code).toContain("ft-goalswipe");
    expect(code).toContain("ftgames-kick-v1");
    expect(code).not.toContain("ftl-main");
    expect(code).not.toContain("ftg-bar");
  });
});
