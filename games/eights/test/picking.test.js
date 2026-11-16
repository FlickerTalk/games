import { describe, expect, it } from "vitest";
import { cardMove, choices, handOrder } from "../src/picking.js";
import { commitText, initial, play, revealText, seedText, turn } from "../src/rules.js";

const A = Uint8Array.from({ length: 24 }, (_, at) => at + 1);
const B = new Uint8Array(24).fill(0x5a);
const dealt = [commitText(A), seedText(B), revealText(A)].reduce((state, move) => play(state, move, turn(state)).state, initial());
const table = { ...dealt, hands: [[1, 2, 3], [0, 20, 14, 35]], pile: [8], suit: 0, next: 1, stock: [40, 41] };

describe("choosing a card", () => {
  it("holds the hand by suit, then by rank", () => {
    expect(handOrder([51, 0, 14, 13, 1])).toEqual([0, 1, 13, 14, 51]);
  });

  it("opens the cards that may be played, and the stock to draw from, only on the user's turn", () => {
    expect(choices(table, 1, true)).toEqual({ open: true, playable: [0, 20], draw: true, pass: false });
    expect(choices({ ...table, stock: [] }, 1, true)).toMatchObject({ draw: false, pass: true });
    expect(choices(table, 1, false)).toEqual({ open: false, playable: [], draw: false, pass: false });
    expect(choices(table, null, true).open).toBe(false);
    expect(choices(initial(), 0, true).open).toBe(false);
  });

  it("plays a plain card at once, and an eight only once a suit is named", () => {
    expect(cardMove(0)).toBe("p0");
    expect(cardMove(20)).toBeNull();
    expect(cardMove(20, "d")).toBe("p20d");
    expect(play(table, cardMove(20, "d"), 1).state.suit).toBe(2);
  });
});
