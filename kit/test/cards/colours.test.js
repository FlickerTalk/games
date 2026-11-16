import { describe, expect, it } from "vitest";
import { oklchOf } from "../../src/canvas/tone.js";
import { DECK_ART, deckLook } from "../../src/cards/colours.js";

describe("the colours of the shared deck", () => {
  it("are the printed deck's own on a light page", () => {
    expect(DECK_ART.deck).toEqual({ paper: "#FFFFFF", red: "#FF0000", black: "#000000", blue: "#4444FF", gold: "#FFCC44" });
    expect(deckLook(false)).toEqual(DECK_ART);
  });

  it("lower the paper, the gold and the back's border under the bright line on a dark page, the suits in their full colour", () => {
    const look = deckLook(true);
    for (const colour of [look.deck.paper, look.deck.gold, look.back.border, look.back.lattice]) expect(oklchOf(colour).l).toBeLessThan(0.8);
    expect([look.deck.red, look.deck.black, look.deck.blue]).toEqual([DECK_ART.deck.red, DECK_ART.deck.black, DECK_ART.deck.blue]);
    expect(deckLook(true)).toBe(look);
  });
});
