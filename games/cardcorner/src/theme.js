import { deckLook, dimmed } from "../../../kit/src/cards/colours.js";
import { tabletopTheme } from "../../../kit/src/tabletop/theme.js";

const freeze = (value) => (value && typeof value === "object" && !Array.isArray(value) ? Object.freeze(Object.fromEntries(Object.entries(value).map(([key, one]) => [key, freeze(one)]))) : value);

export const ART = freeze({
  ink: "#243247",
  tables: {
    cloth: { felt: "#356B52", line: "#668D76" },
    wood: { felt: "#8A6547", line: "#A6805E" },
    slate: { felt: "#46515B", line: "#69757E" },
  },
  dusk: {
    cloth: { felt: "#294F3F", line: "#4B7A63" },
    wood: { felt: "#6E4E37", line: "#8A6547" },
    slate: { felt: "#343E47", line: "#56616B" },
  },
  sides: [
    { body: "#E7BE45", mark: "circle" },
    { body: "#747B9E", mark: "diamond" },
  ],
  marks: { glow: "#F4DF91", chosen: "#E7BE45", shade: "#1D2B3A", clock: "#FFFDF5", fish: "#A9DFE8" },
});

export const TABLE_OF = Object.freeze({ choose: "cloth", pairs: "wood", war: "slate", rummy: "cloth", fish: "cloth" });

const made = new Map();

export function themeFor(tokens, { dark = false } = {}) {
  const key = JSON.stringify([tokens, dark]);
  if (!made.has(key)) {
    const base = tabletopTheme(tokens, { dark }, { ink: ART.ink, sides: ART.sides });
    const look = deckLook(base.dark);
    made.set(key, Object.freeze({ ...base, tables: base.dark ? ART.dusk : ART.tables, deck: look.deck, back: look.back, marks: dimmed(ART.marks, base.dark) }));
  }
  return made.get(key);
}

export function sideMark(side) {
  const { body, mark } = ART.sides[side];
  const shape = mark === "circle" ? `<circle r="19" fill="${body}" stroke="${ART.ink}" stroke-width="3"/>` : `<polygon points="0,-21 20,0 0,21 -20,0" fill="${body}" stroke="${ART.ink}" stroke-width="3"/>`;
  const cards = (mark === "circle" ? [0] : [-3.5, 3.5]).map((dx) => `<rect x="${dx - 4.5}" y="-8" width="9" height="16" rx="1.5" fill="#FFFFFF" stroke="${ART.ink}" stroke-width="1.6"/>`).join("");
  return `<svg viewBox="-24 -24 48 48" aria-hidden="true">${shape}${cards}</svg>`;
}
