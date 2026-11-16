import { describe, expect, it } from "vitest";
import { card } from "../src/card.js";
import { fits, findMelds, meldKind } from "../src/melds.js";

const run = (suit, ...ranks) => ranks.map((rank) => card(suit, rank));
const set = (rank, ...suits) => suits.map((suit) => card(suit, rank));

describe("a meld", () => {
  it("is a set of three or four cards of one rank", () => {
    expect(meldKind(set(6, 0, 1, 2))).toBe("set");
    expect(meldKind(set(6, 0, 1, 2, 3))).toBe("set");
    expect(meldKind(set(6, 0, 1))).toBeNull();
    expect(meldKind([card(0, 6), card(1, 6), card(2, 7)])).toBeNull();
  });

  it("is a run of three or more cards in sequence in one suit, in any order, the ace low only", () => {
    expect(meldKind(run(1, 0, 1, 2))).toBe("run");
    expect(meldKind(run(1, 5, 3, 4, 6))).toBe("run");
    expect(meldKind(run(3, 10, 11, 12))).toBe("run");
    expect(meldKind(run(1, 11, 12, 0))).toBeNull();
    expect(meldKind(run(1, 2, 3, 5))).toBeNull();
    expect(meldKind([card(1, 2), card(1, 3), card(2, 4)])).toBeNull();
    expect(meldKind([card(1, 2), card(1, 2), card(1, 3)])).toBeNull();
  });

  it("takes one more card where it still makes a set or a run", () => {
    expect(fits(set(6, 0, 1, 2), card(3, 6))).toBe(true);
    expect(fits(set(6, 0, 1, 2), card(3, 7))).toBe(false);
    expect(fits(run(2, 3, 4, 5), card(2, 2))).toBe(true);
    expect(fits(run(2, 3, 4, 5), card(2, 6))).toBe(true);
    expect(fits(run(2, 3, 4, 5), card(2, 7))).toBe(false);
    expect(fits(run(2, 3, 4, 5), card(1, 6))).toBe(false);
  });

  it("finds the runs and then the sets a hand holds, no card used twice", () => {
    const hand = [...run(0, 2, 3, 4, 5), ...set(9, 1, 2, 3), card(1, 4), card(2, 4), card(3, 0)];
    expect(findMelds(hand)).toEqual([run(0, 2, 3, 4, 5), set(9, 1, 2, 3)]);
    expect(findMelds([...run(0, 2, 3, 4), card(1, 3), card(2, 3)])).toEqual([run(0, 2, 3, 4)]);
    expect(findMelds([card(0, 1), card(1, 5)])).toEqual([]);
  });
});
