import { fromOklch, oklchOf } from "../../../kit/src/canvas/tone.js";
import { tabletopTheme } from "../../../kit/src/tabletop/theme.js";

const freeze = (value) => (value && typeof value === "object" ? Object.freeze(Object.fromEntries(Object.entries(value).map(([key, one]) => [key, freeze(one)]))) : value);

export const ART = freeze({
  ink: "#243247",
  table: { felt: "#356B52", line: "#668D76" },
  deck: { paper: "#FFFFFF", red: "#FF0000", black: "#000000", blue: "#4444FF", gold: "#FFCC44" },
  back: { field: "#315B88", lattice: "#C9D6E6", border: "#FFFFFF" },
  sides: [
    { body: "#E7BE45", mark: "circle" },
    { body: "#747B9E", mark: "diamond" },
  ],
  marks: { glow: "#F4DF91", chosen: "#E7BE45", last: "#F4DF91", chip: "#FFF7DF", shade: "#1D3B2D", clock: "#FFFDF5" },
});

const DIM_TOP = 0.78;

function dimmed(palette, dark) {
  if (!dark) return palette;
  return Object.freeze(Object.fromEntries(Object.entries(palette).map(([key, colour]) => {
    const tone = oklchOf(colour);
    return [key, tone.l > DIM_TOP ? fromOklch({ ...tone, l: DIM_TOP }) : colour];
  })));
}

const made = new Map();

export function themeFor(tokens, { dark = false } = {}) {
  const key = JSON.stringify([tokens, dark]);
  if (!made.has(key)) {
    const base = tabletopTheme(tokens, { dark }, { board: ART.table, ...ART });
    const shown = base.dark;
    made.set(key, Object.freeze({ ...base, table: base.board, deck: dimmed(ART.deck, shown), back: dimmed(ART.back, shown), marks: dimmed(ART.marks, shown) }));
  }
  return made.get(key);
}
