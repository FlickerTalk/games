import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "esbuild";
import { describe, expect, it } from "vitest";
import { buildGame } from "../../build.js";
import * as SOUND from "../../src/sound/index.js";

const kit = join(import.meta.dirname, "..", "..", "src");
const MARKS = ["lose-soft", "ftg-volume", "musical-notes", "ftg-sound-buttons"];

async function bundled(contents) {
  const { outputFiles } = await build({
    stdin: { contents, resolveDir: kit, loader: "js" },
    bundle: true,
    write: false,
    format: "esm",
    minify: true,
    loader: { ".css": "text" },
    logLevel: "silent",
  });
  return outputFiles[0].text;
}

describe("the sound module", () => {
  it("offers a small surface: the engine, the board games' opt-in, the controls, and the library as data", () => {
    expect(Object.keys(SOUND).sort()).toEqual(
      [
        "DEFAULT_SETTINGS", "EFFECTS", "SOUND_ICONS", "SOUND_TEXTS", "TUNES",
        "createSound", "hold", "keyValue", "lineValue", "loudness", "mountSoundControls", "noise", "note", "pluck", "soundControls", "soundIcon", "withSound",
      ].sort(),
    );
  });

  it("leaves the page controls and the board games' part out of a game that only plays sounds", async () => {
    const code = await bundled('import { createSound } from "./sound/index.js"; globalThis.sound = createSound();');
    expect(code).toContain("lose-soft");
    expect(code).not.toContain("ftg-volume");
    expect(code).not.toContain("ftg-sound-buttons");
  });

  it("is not in a game that does not ask for it, and nothing else in the kit brings it in", async () => {
    const out = mkdtempSync(join(tmpdir(), "ftgames-quiet-"));
    await buildGame(join(import.meta.dirname, "..", "fixture"), { outdir: out });
    const code = readFileSync(join(out, "index.js"), "utf8");
    for (const mark of MARKS) expect(code, mark).not.toContain(mark);
    for (const folder of [kit, join(kit, "live")]) {
      for (const file of readdirSync(folder).filter((name) => name.endsWith(".js"))) {
        expect(readFileSync(join(folder, file), "utf8"), file).not.toMatch(/from\s+["'][./]*sound\//);
      }
    }
  });

  it("stays under 26 KB once built and minified, everything in it", async () => {
    const code = await bundled('export * from "./sound/index.js";');
    expect(code.length).toBeLessThan(26 * 1024);
  });
});
