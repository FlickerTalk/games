import { tabletopTheme } from "../../../kit/src/tabletop/theme.js";

const freeze = (value) => (value && typeof value === "object" ? Object.freeze(Array.isArray(value) ? value.map(freeze) : Object.fromEntries(Object.entries(value).map(([key, one]) => [key, freeze(one)]))) : value);

export const ART = freeze({
  ink: "#243247",
  board: { light: "#D7B584", dark: "#8B6247", frame: "#5C4032", grain: "#A77B58" },
  pieces: [
    { fill: "#F4EBD8", shade: "#CBBBA1", band: null },
    { fill: "#39434E", shade: "#242D36", band: "#B5BEC5" },
  ],
  jewel: "#E3D3AE",
  marks: { dot: "#A9C5BA", take: "#9B5C52", chosen: "#E3D3AE", waiting: "#B5BEC5", clock: "#FFFDF5" },
  sides: ["#C7A76B", "#87939F"],
});

const made = new Map();

export function themeFor(tokens, { dark = false } = {}) {
  const key = JSON.stringify([tokens, dark]);
  if (!made.has(key)) made.set(key, tabletopTheme(tokens, { dark }, ART));
  return made.get(key);
}
