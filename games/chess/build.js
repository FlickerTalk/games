// What the chess package needs from its build (README, "Packages"). The Chessnut pieces (Alexis
// Luengas, Apache-2.0, vendor/chessnut) become the SVG sprite cm-chessboard draws from: it looks
// each piece up as `<use href="#wk">` in a 40-unit tile, and Chessnut draws on an 800-unit
// artboard, so each piece is wrapped in `<g id="wk" transform="scale(0.05)">`. The ids, comments
// and doctype of the Illustrator export go (twelve files in one document would repeat their ids),
// styles become attributes and the hidden strokes are dropped.
//
// `node games/chess/build.js` writes the sprite to src/pieces.js; a test checks it is current.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const TILE = 40;
const ARTBOARD = 800;
export const PIECE_IDS = ["wk", "wq", "wr", "wb", "wn", "wp", "bk", "bq", "br", "bb", "bn", "bp"];

/** `style="fill:#fff;stroke:#000"` as presentation attributes; `enable-background` is dropped. */
function presentation(style) {
  return style
    .split(";")
    .map((rule) => rule.split(":").map((part) => part.trim()))
    .filter(([name, value]) => name && value && name !== "enable-background")
    .map(([name, value]) => ` ${name}="${value}"`)
    .join("");
}

/** The drawing inside one Chessnut file: no prolog, comments, ids or hidden strokes; whitespace collapsed. */
export function pieceBody(svg) {
  return svg
    .replace(/<\?xml[^>]*\?>/g, "")
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/^[\s\S]*?<svg\b[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "")
    .replace(/\s+id="[^"]*"/g, "")
    .replace(/\s+style="([^"]*)"/g, (_, style) => presentation(style))
    .replace(/<[a-z]+\b[^>]*\sdisplay="none"[^>]*\/>/g, "")
    .replace(/\s+/g, " ")
    .replace(/>\s+</g, "><")
    .trim();
}

/** The sprite, one `<g>` per piece id, from the folder that holds Chessnut's `wK.svg` … `bP.svg`. */
export function buildSprite(dir) {
  const pieces = PIECE_IDS.map((id) => {
    const file = `${id[0]}${id[1].toUpperCase()}.svg`;
    return `<g id="${id}" transform="scale(${TILE / ARTBOARD})">${pieceBody(readFileSync(join(dir, file), "utf8"))}</g>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" aria-hidden="true">${pieces.join("")}</svg>`;
}

/** src/pieces.js, as it is written. */
export function piecesModule(sprite) {
  return (
    "// The Chessnut pieces (Alexis Luengas, Apache-2.0) as one SVG sprite, written by\n" +
    "// `node games/chess/build.js` from vendor/chessnut: do not edit.\n" +
    `export const PIECES = ${JSON.stringify(sprite)};\n`
  );
}

export const plugins = [];

if (process.argv[1] === import.meta.filename) {
  const dir = import.meta.dirname;
  writeFileSync(join(dir, "src", "pieces.js"), piecesModule(buildSprite(join(dir, "vendor", "chessnut"))));
  console.log("chess: src/pieces.js written");
}
