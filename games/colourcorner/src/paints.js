import { PAINT_KEYS } from "./theme.js";

export const PATTERNS = Object.freeze(["dots", "stripes", "stars", "rainbow", "glitter"]);

const LETTER = { dots: "d", stripes: "s", stars: "t", rainbow: "r", glitter: "g" };
const PATTERN = Object.fromEntries(Object.entries(LETTER).map(([name, letter]) => [letter, name]));
const TOKEN = /^(?:([dst])?(0|[1-9]\d?)|([rg]))$/;

export function paintOf(token) {
  const found = typeof token === "string" ? TOKEN.exec(token) : null;
  if (!found) return null;
  if (found[3]) return { colour: null, pattern: PATTERN[found[3]] };
  const colour = Number(found[2]);
  if (colour >= PAINT_KEYS.length) return null;
  return { colour, pattern: found[1] ? PATTERN[found[1]] : null };
}

export const isPaint = (token) => paintOf(token) !== null;

export function paintToken({ colour, pattern }) {
  if (pattern === "rainbow" || pattern === "glitter") return LETTER[pattern];
  return `${pattern ? LETTER[pattern] : ""}${colour}`;
}
