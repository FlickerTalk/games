import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildGame } from "../../../kit/build.js";
import { checkDist, checkLocales, checkManifest } from "../../../kit/test/helpers.js";
import { TEXTS } from "../src/texts.js";

const dir = join(import.meta.dirname, "..");
const identity = { id: "com.flickertalk.game.cardcorner", name: "Card Corner", component: "ft-cardcorner" };

describe("the Card Corner package", () => {
  it("says it is a game that needs the core 1.6.0, the live channel and sending, and nothing else", () => {
    const manifest = checkManifest(dir, identity);
    expect(manifest.version).toBe("1.0.1");
    expect(manifest.summary).toMatch(/Pairs, War, Rummy and Go Fish/);
    expect(manifest.summary).not.toMatch(/child|kid/i);
  });

  it("names and describes itself in the app's other 20 languages, the name its own title there", () => {
    checkLocales(checkManifest(dir, identity), TEXTS);
  });

  it("carries in dist/ exactly what src/ builds", async () => {
    const out = mkdtempSync(join(tmpdir(), "ftgames-fcc-"));
    await buildGame(dir, { outdir: out });
    expect(readFileSync(join(out, "index.js")).equals(readFileSync(join(dir, "dist", "index.js"))), "run npm run build").toBe(true);
    expect(readFileSync(join(out, "THIRD_PARTY_NOTICES.md")).equals(readFileSync(join(dir, "dist", "THIRD_PARTY_NOTICES.md")))).toBe(true);
  });

  it("stays under 360 KB, names its third-party works, Ionicons and the deck of playing cards, and loads nothing from outside", () => {
    expect(checkDist(dir, { cap: 360 * 1024 })).toBeGreaterThan(20_000);
    const notices = readFileSync(join(dir, "dist", "THIRD_PARTY_NOTICES.md"), "utf8");
    expect(notices).toContain("its third-party works are Ionicons and Adrian Kennard's playing cards");
    expect(notices).toMatch(/## Playing cards by Adrian Kennard[\s\S]*Licence: CC0 1\.0/);
  });

  it("carries the deck once, the one the kit shares", () => {
    const code = readFileSync(join(dir, "dist", "index.js"), "utf8");
    const courts = code.match(/A7Q4cBgKAAzFTFwM74BwM84BAzFUBgKAArYzUBgPA/g) ?? [];
    expect(courts).toHaveLength(1);
  });
});
