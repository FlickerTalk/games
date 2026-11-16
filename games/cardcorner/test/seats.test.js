import { describe, expect, it } from "vitest";
import { handPlaces, seatsLayout } from "../src/seats.js";
import { SIZES, apart, inside } from "./rig.js";

describe("a table with a hand at each end", () => {
  it("keeps the other player's cards, the two rows, the middle and the user's hand apart and inside the board at every size", () => {
    for (const size of SIZES) {
      for (const count of [0, 3, 7, 8, 12, 15, 26]) {
        for (const least of [1, 2]) {
          const layout = seatsLayout(size, count, { least });
          const middle = { x: layout.inner.x, y: layout.centre - layout.pile.h / 2, w: layout.inner.w, h: layout.pile.h };
          const parts = [layout.rival, layout.upper, middle, layout.lower, layout.hand.box];
          for (const part of parts) expect(inside(part, size), `${size}/${count}`).toBe(true);
          for (const [at, one] of parts.entries()) for (const other of parts.slice(at + 1)) expect(apart(one, other), `${size}/${count}/${least}`).toBe(true);
        }
      }
    }
  });

  it("keeps seven cards in one row, or two rows from five cards up where a game draws an eighth every turn", () => {
    expect(seatsLayout(343, 7).hand.rows).toBe(1);
    expect(seatsLayout(343, 4, { least: 2 }).hand.rows).toBe(1);
    expect(seatsLayout(343, 5, { least: 2 }).hand.rows).toBe(2);
    expect(seatsLayout(343, 8, { least: 2 }).hand.rows).toBe(2);
    expect(seatsLayout(343, 20).hand.rows).toBe(3);
  });

  it("leaves every card of the hand at least 44 px to touch on a phone, lifting the chosen ones", () => {
    for (const count of [7, 8, 14]) {
      const cards = Array.from({ length: count }, (_, at) => at * 3);
      const layout = seatsLayout(343, count, { least: 2 });
      const places = handPlaces(layout, cards, new Set([cards[1]]));
      expect(places.map((one) => one.card)).toEqual(cards);
      for (const { reach } of places) {
        expect(reach.w, `${count}`).toBeGreaterThanOrEqual(44);
        expect(reach.h, `${count}`).toBeGreaterThanOrEqual(40);
      }
      expect(places[1].y).toBeLessThan(handPlaces(layout, cards)[1].y);
    }
  });
});
