import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildGame } from "../../../kit/build.js";
import { checkDist, checkLocales, checkManifest } from "../../../kit/test/helpers.js";
import { BRANDS } from "../../fourinarow/test/brands.js";
import { TEXTS } from "../src/texts.js";

const dir = join(import.meta.dirname, "..");
const OTHER_GAMES = [/galaga/i, /galaxian/i, /space\s*invaders/i, /star\s*buddies/i];
const NOT_TOYS = [/\bguns?\b/i, /weapon/i, /\bkill/i, /destroy/i, /\bwar\b/i];
const SAY = { id: "com.flickertalk.game.duosquad", name: "Duo Squad", component: "ft-duosquad" };

describe("the Duo Squad package", () => {
  it("says it is a game that needs the core 1.6.0, the live channel and sending, and nothing else", () => {
    expect(checkManifest(dir, SAY).version).toBe("1.0.1");
  });

  it("names and describes itself in the app's other 20 languages, for the whole family, as a team and without anyone else's game names", () => {
    const manifest = checkManifest(dir, SAY);
    checkLocales(manifest, TEXTS, { brands: [...BRANDS, ...OTHER_GAMES, /child|kid/i] });
    expect(manifest.summary).toContain("whole family");
    expect(manifest.summary).toContain("same team");
    for (const word of NOT_TOYS) expect(manifest.summary).not.toMatch(word);
  });

  it("carries the same labels in all 21 languages, none left in English", () => {
    const keys = Object.keys(TEXTS.en).sort();
    for (const [lang, texts] of Object.entries(TEXTS)) {
      expect(Object.keys(texts).sort(), lang).toEqual(keys);
      expect(texts.craft, lang).toContain("{n}");
      if (lang !== "en") for (const key of ["canvas", "looks", "sea", "land", "craft"]) expect(texts[key], `${lang}.${key}`).not.toBe(TEXTS.en[key]);
    }
  });

  it("keeps every source file under 500 lines", () => {
    for (const file of readdirSync(join(dir, "src")).filter((one) => one.endsWith(".js"))) {
      expect(readFileSync(join(dir, "src", file), "utf8").split("\n").length, file).toBeLessThanOrEqual(500);
    }
  });

  it("carries in dist/ exactly what src/ builds", async () => {
    const out = mkdtempSync(join(tmpdir(), "ftgames-duosquad-"));
    await buildGame(dir, { outdir: out });
    expect(readFileSync(join(out, "index.js")).equals(readFileSync(join(dir, "dist", "index.js"))), "run npm run build").toBe(true);
    expect(readFileSync(join(out, "THIRD_PARTY_NOTICES.md")).equals(readFileSync(join(dir, "dist", "THIRD_PARTY_NOTICES.md")))).toBe(true);
  });

  it("stays under 215 KB with its three worlds of art, says its one third-party work is Ionicons, and loads nothing from outside", () => {
    expect(checkDist(dir, { cap: 215 * 1024 })).toBeGreaterThan(20_000);
    expect(readFileSync(join(dir, "dist", "THIRD_PARTY_NOTICES.md"), "utf8")).toContain("its one third-party work is Ionicons");
  });

  it("brings the kit's live bridge but not the live page nor the turn-based shell", () => {
    const code = readFileSync(join(dir, "dist", "index.js"), "utf8");
    expect(code).toContain("ft-duosquad");
    expect(code).toContain('"1.0.1"');
    expect(code).not.toContain("ftl-main");
    expect(code).not.toContain("ftg-bar");
  });
});
