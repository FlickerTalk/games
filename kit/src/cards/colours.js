import { fromOklch, oklchOf } from "../canvas/tone.js";

const freeze = (value) => (value && typeof value === "object" ? Object.freeze(Object.fromEntries(Object.entries(value).map(([key, one]) => [key, freeze(one)]))) : value);

export const DECK_ART = freeze({
  deck: { paper: "#FFFFFF", red: "#FF0000", black: "#000000", blue: "#4444FF", gold: "#FFCC44" },
  back: { field: "#315B88", lattice: "#C9D6E6", border: "#FFFFFF" },
});

const DIM_TOP = 0.78;

export function dimmed(palette, dark, top = DIM_TOP) {
  if (!dark) return palette;
  return Object.freeze(Object.fromEntries(Object.entries(palette).map(([key, colour]) => {
    const tone = oklchOf(colour);
    return [key, tone.l > top ? fromOklch({ ...tone, l: top }) : colour];
  })));
}

const DARK = Object.freeze({ deck: dimmed(DECK_ART.deck, true), back: dimmed(DECK_ART.back, true) });

export const deckLook = (dark) => (dark ? DARK : DECK_ART);
