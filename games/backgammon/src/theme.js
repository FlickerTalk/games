import { tabletopTheme } from "../../../kit/src/tabletop/theme.js";

const freeze = (value) => (value && typeof value === "object" ? Object.freeze(Array.isArray(value) ? value.map(freeze) : Object.fromEntries(Object.entries(value).map(([key, one]) => [key, freeze(one)]))) : value);

export const ART = freeze({
  ink: "#243247",
  board: { case: "#72513E", rail: "#967253", tray: "#4B352D", field: "#C4A984", pointA: "#E2CFAB", pointB: "#725043", detail: "#5D4235" },
  pieces: [
    { body: "#E7DCC4", light: "#F5EEDF", dark: "#A99570", mark: "diamond", sign: "#243247" },
    { body: "#754A45", light: "#A9786D", dark: "#4D302E", mark: "bars", sign: "#F5E7C6" },
  ],
  dice: [
    { face: "#FFF7DF", pip: "#243247" },
    { face: "#A9786D", pip: "#243247" },
  ],
  marks: { dot: "#FFF7DF", ring: "#FFFDF5", line: "#A65F4E", clock: "#FFFDF5", count: "#FFF7DF" },
  sides: ["#A99570", "#754A45"],
});

const made = new Map();

export function themeFor(tokens, { dark = false } = {}) {
  const key = JSON.stringify([tokens, dark]);
  if (!made.has(key)) made.set(key, tabletopTheme(tokens, { dark }, ART));
  return made.get(key);
}
