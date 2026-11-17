import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildGame } from "../../../kit/build.js";
import { checkDist, checkLocales, checkManifest } from "../../../kit/test/helpers.js";
import { BRANDS } from "../../fourinarow/test/brands.js";
import { TEXTS } from "../src/texts.js";

const dir = join(import.meta.dirname, "..");
const LOOKALIKES = [/thomas/i, /\bbrio\b/i, /chuggington/i, /incredibox/i];
const ME = { id: "com.flickertalk.game.beatwagons", name: "Beat Wagons", component: "ft-beatwagons" };

describe("the Beat Wagons package", () => {
  it("says it is a game that needs the core 1.6.0, the live channel and sending, and nothing else", () => {
    expect(checkManifest(dir, ME).version).toBe("1.0.5");
  });

  it("names and describes itself in the app's other 20 languages, for the whole family and without anyone else's game names", () => {
    const manifest = checkManifest(dir, ME);
    checkLocales(manifest, TEXTS, { brands: [...BRANDS, ...LOOKALIKES] });
    expect(manifest.summary).toMatch(/whole family/);
    expect(JSON.stringify(manifest)).not.toMatch(/child|kid/i);
  });

  it("carries in dist/ exactly what src/ builds", async () => {
    const out = mkdtempSync(join(tmpdir(), "ftgames-beatwagons-"));
    await buildGame(dir, { outdir: out });
    expect(readFileSync(join(out, "index.js")).equals(readFileSync(join(dir, "dist", "index.js"))), "run npm run build").toBe(true);
    expect(readFileSync(join(out, "THIRD_PARTY_NOTICES.md")).equals(readFileSync(join(dir, "dist", "THIRD_PARTY_NOTICES.md")))).toBe(true);
  });

  it("stays under 200 KB, says its one third-party work is Ionicons, and loads nothing from outside", () => {
    expect(checkDist(dir, { cap: 200 * 1024 })).toBeGreaterThan(20_000);
    expect(readFileSync(join(dir, "dist", "THIRD_PARTY_NOTICES.md"), "utf8")).toContain("its one third-party work is Ionicons");
  });

  it("defines its element when loaded, with the version of its manifest", () => {
    const code = readFileSync(join(dir, "dist", "index.js"), "utf8");
    expect(code).toContain("ft-beatwagons");
    expect(code).toContain('"1.0.5"');
  });
});
