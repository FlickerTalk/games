import { describe, expect, it } from "vitest";
import { card, isRed, pointsOf, rankOf, sameKind, suitOf, warValue } from "../src/card.js";

describe("a playing card as a number", () => {
  it("has its suit in spades, hearts, diamonds, clubs order and its rank from the ace up", () => {
    expect([suitOf(0), rankOf(0)]).toEqual([0, 0]);
    expect([suitOf(51), rankOf(51)]).toEqual([3, 12]);
    expect(card(1, 11)).toBe(24);
    expect([0, 1, 2, 3].map((suit) => isRed(card(suit, 4)))).toEqual([false, true, true, false]);
  });

  it("is of the same kind as the other card of its rank and colour only", () => {
    expect(sameKind(card(1, 6), card(2, 6))).toBe(true);
    expect(sameKind(card(0, 6), card(3, 6))).toBe(true);
    expect(sameKind(card(0, 6), card(1, 6))).toBe(false);
    expect(sameKind(card(1, 6), card(2, 7))).toBe(false);
  });

  it("counts the ace highest in War, and one point in Rummy where the courts count ten", () => {
    expect(warValue(card(0, 0))).toBeGreaterThan(warValue(card(0, 12)));
    expect(warValue(card(0, 1))).toBeLessThan(warValue(card(2, 2)));
    expect([0, 4, 9, 10, 12].map((rank) => pointsOf(card(2, rank)))).toEqual([1, 5, 10, 10, 10]);
  });
});
