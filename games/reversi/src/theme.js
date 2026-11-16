import { tabletopTheme } from "../../../kit/src/tabletop/theme.js";

const freeze = (value) => (value && typeof value === "object" ? Object.freeze(Object.fromEntries(Object.entries(value).map(([key, one]) => [key, freeze(one)]))) : value);

export const ART = freeze({
  ink: "#243247",
  board: { frame: "#2F7B59", light: "#438E68", dark: "#2F7B59", stitch: "#438E68" },
  pieces: [
    { body: "#34445B", edge: "#596B82", shine: "#596B82", mark: "#FFE584", sign: "dots" },
    { body: "#FFF6DB", edge: "#E7D8B5", shine: "#FFFDF5", mark: "#596B82", sign: "ring" },
  ],
  marks: { cream: "#FFF7DF", coral: "#FF6B54", glow: "#FFE584", star: "#FFC846", white: "#FFFDF5" },
});

const made = new Map();

export function themeFor(tokens, { dark = false } = {}) {
  const key = JSON.stringify([tokens, dark]);
  if (!made.has(key)) made.set(key, tabletopTheme(tokens, { dark }, ART));
  return made.get(key);
}
