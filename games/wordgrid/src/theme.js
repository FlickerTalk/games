import { tabletopTheme } from "../../../kit/src/tabletop/theme.js";

const freeze = (value) => (value && typeof value === "object" ? Object.freeze(Array.isArray(value) ? value.map(freeze) : Object.fromEntries(Object.entries(value).map(([key, one]) => [key, freeze(one)]))) : value);

export const ART = freeze({
  ink: "#243247",
  board: { frame: "#D99B62", face: "#F2C88F", inner: "#D99B62", edge: "#A96643" },
  sides: [
    { body: "#FFCF3F", mark: "star" },
    { body: "#8D7DE8", mark: "diamond" },
  ],
  marks: { white: "#FFFDF5", star: "#FFC846", spark: "#FFB15C" },
});

const made = new Map();

export function themeFor(tokens, { dark = false } = {}) {
  const key = JSON.stringify([tokens, dark]);
  if (!made.has(key)) made.set(key, tabletopTheme(tokens, { dark }, ART));
  return made.get(key);
}
