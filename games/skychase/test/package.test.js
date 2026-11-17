import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildGame } from "../../../kit/build.js";
import { checkDist, checkLocales, checkManifest } from "../../../kit/test/helpers.js";
import { BRANDS } from "../../fourinarow/test/brands.js";
import { TEXTS } from "../src/texts.js";

const dir = join(import.meta.dirname, "..");
const OTHER_GAMES = [/top\s*gun/i, /ace\s*combat/i, /red\s*baron/i, /star\s*fox/i, /mario/i, /dogfight/i];
const SAY = { id: "com.flickertalk.game.skychase", name: "Sky Chase", component: "ft-skychase" };

describe("the Sky Chase package", () => {
  it("says it is a game that needs the core 1.6.0, the live channel and sending, and nothing else", () => {
    expect(checkManifest(dir, SAY).version).toBe("1.0.2");
  });

  it("names and describes itself in the app's other 20 languages, for the whole family and without anyone else's game names", () => {
    const manifest = checkManifest(dir, SAY);
    const locales = checkLocales(manifest, TEXTS, { brands: [...BRANDS, ...OTHER_GAMES, /child|kid/i] });
    expect(manifest.summary).toContain("whole family");
    for (const lang of Object.keys(locales)) expect(locales[lang].summary, lang).not.toBe(manifest.summary);
  });

  it("carries in dist/ exactly what src/ builds", async () => {
    const out = mkdtempSync(join(tmpdir(), "ftgames-skychase-"));
    await buildGame(dir, { outdir: out });
    expect(readFileSync(join(out, "index.js")).equals(readFileSync(join(dir, "dist", "index.js"))), "run npm run build").toBe(true);
    expect(readFileSync(join(out, "THIRD_PARTY_NOTICES.md")).equals(readFileSync(join(dir, "dist", "THIRD_PARTY_NOTICES.md")))).toBe(true);
  });

  it("stays under 180 KB, says its one third-party work is Ionicons, and loads nothing from outside", () => {
    expect(checkDist(dir, { cap: 180 * 1024 })).toBeGreaterThan(20_000);
    expect(readFileSync(join(dir, "dist", "THIRD_PARTY_NOTICES.md"), "utf8")).toContain("its one third-party work is Ionicons");
  });

  it("brings the kit's live bridge but not the live page nor the turn-based shell", () => {
    const code = readFileSync(join(dir, "dist", "index.js"), "utf8");
    expect(code).toContain("ft-skychase");
    expect(code).toContain('"1.0.2"');
    expect(code).not.toContain("ftl-main");
    expect(code).not.toContain("ftg-bar");
  });
});
