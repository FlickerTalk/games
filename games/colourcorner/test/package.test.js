import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildGame } from "../../../kit/build.js";
import { checkDist, checkLocales, checkManifest } from "../../../kit/test/helpers.js";
import { BRANDS } from "../../fourinarow/test/brands.js";
import { TEXTS } from "../src/texts.js";

const dir = join(import.meta.dirname, "..");
const ID = { id: "com.flickertalk.game.colourcorner", name: "Colour Corner", component: "ft-colourcorner" };

describe("the Colour Corner package", () => {
  it("says it is a game that needs the core 1.6.0, the live channel and sending, and nothing else", () => {
    expect(checkManifest(dir, ID).version).toBe("1.0.1");
  });

  it("names and describes itself in the app's other 20 languages, never as a game for children", () => {
    const locales = checkLocales(checkManifest(dir, ID), TEXTS, { brands: BRANDS });
    for (const { summary } of Object.values(locales)) expect(summary).not.toMatch(/child|kid|niñ|enfant|Kinder|bambin|crianç|copii|дет|діт|çocuk/i);
  });

  it("carries in dist/ exactly what src/ builds", async () => {
    const out = mkdtempSync(join(tmpdir(), "ftgames-colourcorner-"));
    await buildGame(dir, { outdir: out });
    expect(readFileSync(join(out, "index.js")).equals(readFileSync(join(dir, "dist", "index.js"))), "run npm run build").toBe(true);
    expect(readFileSync(join(out, "THIRD_PARTY_NOTICES.md")).equals(readFileSync(join(dir, "dist", "THIRD_PARTY_NOTICES.md")))).toBe(true);
  });

  it("stays under 240 KB, says its one third-party work is Ionicons, and loads nothing from outside", () => {
    expect(checkDist(dir, { cap: 240 * 1024 })).toBeGreaterThan(20_000);
    expect(readFileSync(join(dir, "dist", "THIRD_PARTY_NOTICES.md"), "utf8")).toContain("its one third-party work is Ionicons");
  });

  it("defines its element when loaded, with the version of its manifest", () => {
    const code = readFileSync(join(dir, "dist", "index.js"), "utf8");
    expect(code).toContain("ft-colourcorner");
    expect(code).toContain('"1.0.1"');
  });
});
