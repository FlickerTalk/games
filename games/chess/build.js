// `node games/chess/build.js` writes the sprite to src/pieces.js. Chessnut draws on an 800-unit
// artboard and cm-chessboard uses a 40-unit tile, hence scale(0.05).

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const TILE = 40;
const ARTBOARD = 800;
export const PIECE_IDS = ["wk", "wq", "wr", "wb", "wn", "wp", "bk", "bq", "br", "bb", "bn", "bp"];

function presentation(style) {
  return style
    .split(";")
    .map((rule) => rule.split(":").map((part) => part.trim()))
    .filter(([name, value]) => name && value && name !== "enable-background")
    .map(([name, value]) => ` ${name}="${value}"`)
    .join("");
}

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

export function buildSprite(dir) {
  const pieces = PIECE_IDS.map((id) => {
    const file = `${id[0]}${id[1].toUpperCase()}.svg`;
    return `<g id="${id}" transform="scale(${TILE / ARTBOARD})">${pieceBody(readFileSync(join(dir, file), "utf8"))}</g>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" aria-hidden="true">${pieces.join("")}</svg>`;
}

export function piecesModule(sprite) {
  return (
    "// The Chessnut pieces (Alexis Luengas, Apache-2.0) as one SVG sprite, written by\n" +
    "// `node games/chess/build.js` from vendor/chessnut: do not edit.\n" +
    `export const PIECES = ${JSON.stringify(sprite)};\n`
  );
}

/** cm-chessboard builds the xlink namespace as "http://www.w3.org/1999/" + prefix. The package checks
 *  refuse a bare http://, so the expression becomes the full namespace. The build stops if it changes. */
export const XLINK = { from: '"http://www.w3.org/1999/" + value[0]', to: '"http://www.w3.org/1999/xlink"' };

const xlinkNamespace = {
  name: "cm-chessboard-xlink",
  setup(build) {
    build.onLoad({ filter: /[\\/]cm-chessboard[\\/]src[\\/]lib[\\/]Svg\.js$/ }, ({ path }) => {
      const source = readFileSync(path, "utf8");
      if (source.split(XLINK.from).length !== 2) throw new Error(`${path}: the xlink namespace is no longer written as ${XLINK.from}`);
      return { contents: source.replace(XLINK.from, XLINK.to), loader: "js" };
    });
  },
};

export const plugins = [xlinkNamespace];

if (process.argv[1] === import.meta.filename) {
  const dir = import.meta.dirname;
  writeFileSync(join(dir, "src", "pieces.js"), piecesModule(buildSprite(join(dir, "vendor", "chessnut"))));
  console.log("chess: src/pieces.js written");
}
