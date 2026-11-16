import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildGame } from "../../../kit/build.js";
import { checkDist, checkLocales, checkManifest } from "../../../kit/test/helpers.js";
import { BRANDS } from "../../fourinarow/test/brands.js";
import { TEXTS } from "../src/texts.js";

const dir = join(import.meta.dirname, "..");
const root = join(dir, "..", "..");
const read = (...path) => readFileSync(join(...path), "utf8");
const code = () => read(dir, "dist", "index.js");
const notices = () => read(dir, "dist", "THIRD_PARTY_NOTICES.md");

describe("the Chess package", () => {
  it("says it is a game that needs the core 1.6.0, the live channel and sending, and nothing else", () => {
    const manifest = checkManifest(dir, { id: "com.flickertalk.game.chess", name: "Chess", component: "ft-chess" });
    expect(manifest.version).toBe("1.2.1");
  });

  it("names and describes itself in the app's other 20 languages, the name its own title there", () => {
    const manifest = checkManifest(dir, { id: "com.flickertalk.game.chess", name: "Chess", component: "ft-chess" });
    checkLocales(manifest, TEXTS, { brands: BRANDS });
  });

  it("carries in dist/ exactly what src/ builds", async () => {
    const out = mkdtempSync(join(tmpdir(), "ftgames-chess-"));
    await buildGame(dir, { outdir: out });
    expect(readFileSync(join(out, "index.js")).equals(readFileSync(join(dir, "dist", "index.js"))), "run npm run build").toBe(true);
    expect(readFileSync(join(out, "THIRD_PARTY_NOTICES.md")).equals(readFileSync(join(dir, "dist", "THIRD_PARTY_NOTICES.md")))).toBe(true);
  });

  it("stays under 252 KB and loads nothing from outside", () => {
    expect(checkDist(dir, { cap: 252 * 1024 })).toBeGreaterThan(100_000);
  });

  it("draws its own board and pieces: nothing of cm-chessboard or of another piece set is left in it", () => {
    const bundle = code();
    expect(bundle).not.toMatch(/cm-chessboard|Chessnut|Luengas|Cburnett|staunty|creativecommons|CC BY/i);
    expect(bundle).toContain("ftt-layer");
  });

  it("runs no code it builds at run time, and fetches nothing", () => {
    const bundle = code();
    expect(bundle).not.toMatch(/\beval\s*\(|new Function|\bFunction\s*\(|\bimport\s*\(|\bfetch\s*\(|\bWorker\b|WebAssembly|importScripts/);
    expect(bundle).not.toMatch(/XMLHttpRequest/);
  });

  it("ships the full licence of chess.js and of the kit's icons, and names no work it no longer carries", () => {
    const text = notices();
    expect(text).toBe(read(dir, "THIRD_PARTY_NOTICES.md"));
    const normal = (licence) => licence.replace(/\s+/g, " ").trim();
    expect(normal(text)).toContain(normal(read(root, "node_modules", "chess.js", "LICENSE")));
    expect(text).toContain("Copyright (c) 2025, Jeff Hlywa");
    expect(text).toMatch(/chess\.js 1\.4\.0/);
    expect(text).toMatch(/## Ionicons 8\.1\.0/);
    expect(text).not.toMatch(/cm-chessboard|Chessnut/);
  });
});
