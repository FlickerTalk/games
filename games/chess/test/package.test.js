// What the catalogue signs for Chess: the manifest (a game, the core it needs, the live channel and
// sending, nothing else) and `dist/`, which is exactly what `src/` builds, under 500 KB, loads nothing
// from anywhere, carries none of cm-chessboard's own artwork (its piece sets and its marker and arrow
// sprites are CC BY-SA or CC BY-NC-SA), and ships the full licence of everything that is inside.
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
  it("says it is a game that needs the core 1.3.0, the live channel and sending, and nothing else", () => {
    const manifest = checkManifest(dir, { id: "com.flickertalk.game.chess", name: "Chess", component: "ft-chess" });
    expect(manifest.version).toBe("1.0.3");
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

  it("stays under 500 KB and loads nothing from outside", () => {
    expect(checkDist(dir, { cap: 500 * 1024 })).toBeGreaterThan(100_000);
  });

  it("holds none of cm-chessboard's own pieces, markers or arrows", () => {
    const bundle = code();
    for (const asset of ["pieces/standard.svg", "pieces/staunty.svg", "extensions/markers/markers.svg", "extensions/arrows/arrows.svg"]) {
      const svg = read(root, "node_modules", "cm-chessboard", "assets", asset);
      const drawings = [...svg.matchAll(/\s(?:d|points)="([^"]{24,})"/g)].map((found) => found[1]);
      expect(drawings.length, asset).toBeGreaterThan(0);
      for (const drawing of drawings) expect(bundle.includes(drawing), `${asset}: ${drawing.slice(0, 40)}`).toBe(false);
    }
    expect(bundle).not.toMatch(/Cburnett|staunty|creativecommons|CC BY/i);
    // The Chessnut pieces and our own marks are what it draws.
    expect(bundle).toMatch(/<g id=\\?"wk\\?" transform=\\?"scale\(0\.05\)\\?">/);
    expect(bundle).toMatch(/<g id=\\?"ftcDot\\?">/);
  });

  it("runs no code it builds at run time, and fetches nothing", () => {
    const bundle = code();
    expect(bundle).not.toMatch(/\beval\s*\(|new Function|\bFunction\s*\(|\bimport\s*\(|\bfetch\s*\(|\bWorker\b|WebAssembly|importScripts/);
    // cm-chessboard's one request: it fetches a sprite only when the sprite is not in the document,
    // and the board puts both there first (the frame spec watches it never happens).
    expect(bundle.split("XMLHttpRequest").length - 1).toBe(1);
  });

  it("ships the full licence of chess.js, cm-chessboard and the Chessnut pieces, and says how the pieces were changed", () => {
    const text = notices();
    expect(text).toBe(read(dir, "THIRD_PARTY_NOTICES.md"));
    const normal = (licence) => licence.replace(/\s+/g, " ").trim();
    for (const licence of [
      read(root, "node_modules", "chess.js", "LICENSE"),
      read(root, "node_modules", "cm-chessboard", "LICENSE"),
      read(dir, "vendor", "chessnut", "LICENSE.txt"),
    ]) {
      expect(normal(text)).toContain(normal(licence));
    }
    expect(text).toContain("Copyright (c) 2025, Jeff Hlywa");
    expect(text).toContain("Copyright (c) 2017 Stefan Haack");
    expect(text).toContain("Copyright 2015 Alexis Luengas");
    expect(text).toMatch(/chess\.js 1\.4\.0/);
    expect(text).toMatch(/cm-chessboard 8\.15\.3/);
    expect(text).toMatch(/2b8eaf14/);
    expect(normal(text)).toContain("The SVG files were modified");
  });
});
