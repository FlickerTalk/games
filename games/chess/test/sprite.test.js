// The pieces are Chessnut's (Alexis Luengas, Apache-2.0), assembled at build time into the one SVG
// sprite cm-chessboard draws from: exactly the 12 ids it looks up (`<use href="#wk">`), each in its
// 40-unit tile, with nothing that reaches outside the document, no inline style, and none of the
// Illustrator ids that twelve files in one document would repeat. `src/pieces.js` is that sprite.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PIECE_IDS, TILE, buildSprite, piecesModule } from "../build.js";
import { PIECES } from "../src/pieces.js";

const dir = join(import.meta.dirname, "..");
const vendor = join(dir, "vendor", "chessnut");
const sprite = buildSprite(vendor);
/** One piece's drawing: from its `<g id>` to the next one. */
function piece(id) {
  const at = sprite.indexOf(`<g id="${id}"`);
  const next = sprite.indexOf(' id="', at + 6);
  return sprite.slice(at, next < 0 ? undefined : next);
}

describe("the Chessnut sprite", () => {
  it("carries exactly the 12 piece ids cm-chessboard looks up", () => {
    expect(PIECE_IDS).toEqual(["wk", "wq", "wr", "wb", "wn", "wp", "bk", "bq", "br", "bb", "bn", "bp"]);
    const ids = [...sprite.matchAll(/\sid="([^"]+)"/g)].map((found) => found[1]);
    expect(ids).toEqual(PIECE_IDS);
  });

  it("scales each piece from Chessnut's 800-unit artboard into the 40-unit tile", () => {
    expect(TILE).toBe(40);
    for (const id of PIECE_IDS) expect(sprite).toContain(`<g id="${id}" transform="scale(0.05)">`);
  });

  it("points nowhere, and holds no style, script, comment or doctype", () => {
    expect(sprite).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="0" height="0" aria-hidden="true">/);
    expect(sprite.split("http").length - 1).toBe(1);
    expect(sprite).not.toMatch(/<\?xml|<!DOCTYPE|<!--|xlink|href|url\(|<image|<style|<script|style=|display=/i);
  });

  it("keeps the drawing: styles become attributes, both colours of each piece", () => {
    expect(sprite).toMatch(/stroke-width="30\.24"/);
    expect(piece("wp")).toMatch(/fill="#FFFFFF"/i);
    // The black pieces are SVG's default black, with light strokes for their lines.
    expect(piece("bp")).not.toMatch(/fill="#FFFFFF"/i);
    expect(piece("bp")).toMatch(/stroke="#F2F2F2"/i);
    // Each file's own drawing, all twelve of them, and nothing else of it.
    for (const id of PIECE_IDS) expect(piece(id).length, id).toBeGreaterThan(300);
    expect(readdirSync(vendor).filter((name) => name.endsWith(".svg"))).toHaveLength(12);
  });

  it("is what src/pieces.js holds (node games/chess/build.js writes it again)", () => {
    expect(PIECES).toBe(sprite);
    expect(readFileSync(join(dir, "src", "pieces.js"), "utf8")).toBe(piecesModule(sprite));
  });
});
