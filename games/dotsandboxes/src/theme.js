import { mixColours } from "../../../kit/src/canvas/tone.js";
import { tabletopTheme } from "../../../kit/src/tabletop/theme.js";

function freeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(freeze));
  if (value && typeof value === "object") return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, one]) => [key, freeze(one)])));
  return value;
}

export const ART = freeze({
  ink: "#243247",
  board: { paper: "#FFFDF4", rule: "#A8D4E4", margin: "#F29A91", track: "#CBD5D5", open: "#718092", tile0: "#FFE584", tile1: "#B8ACF5" },
  pieces: [
    { body: "#FFCF3F", deep: "#E89A2D", mark: "cross" },
    { body: "#8D7DE8", deep: "#6356B8", mark: "ring" },
  ],
  marks: { white: "#FFFDF5" },
});

const TINT = 0.5;
const made = new Map();

function tintedAtDusk(theme) {
  if (!theme.dark) return theme;
  const tiles = Object.fromEntries(theme.pieces.map(({ body }, side) => [`tile${side}`, mixColours(body, theme.board.paper, TINT)]));
  return Object.freeze({ ...theme, board: Object.freeze({ ...theme.board, ...tiles }) });
}

export function themeFor(tokens, { dark = false } = {}) {
  const key = JSON.stringify([tokens, dark]);
  if (!made.has(key)) made.set(key, tintedAtDusk(tabletopTheme(tokens, { dark }, ART)));
  return made.get(key);
}
