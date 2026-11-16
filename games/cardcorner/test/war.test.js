import { describe, expect, it } from "vitest";
import { card } from "../src/card.js";
import { LIMIT, deal, play } from "../src/war.js";

const DECK = Array.from({ length: 52 }, (_, at) => (at * 7) % 52);
const table = (mine, theirs, extra = {}) => ({ piles: [mine, theirs], pot: [[], []], open: [[], []], up: [null, null], war: false, battles: 0, last: null, ...extra });
const both = (seen) => play(play(seen, "f", 1).table, "f", 0);
const [TWO, NINE, KING, ACE] = [card(0, 1), card(1, 8), card(2, 12), card(3, 0)];

describe("War", () => {
  it("gives each player half the deck face down, the first card to the player who did not deal", () => {
    const { table: dealt, next } = deal(DECK);
    expect(dealt.piles.map((pile) => pile.length)).toEqual([26, 26]);
    expect(dealt.piles[1].at(-1)).toBe(DECK[0]);
    expect(dealt.piles[0].at(-1)).toBe(DECK[1]);
    expect(new Set(dealt.piles.flat()).size).toBe(52);
    expect(next).toBe(1);
  });

  it("turns one card each, the non-dealer first, and gives both to the higher one, under the winner's pile", () => {
    const first = play(table([5, NINE], [6, KING]), "f", 1);
    expect(first).toMatchObject({ next: 0, table: { up: [null, KING], pot: [[], [KING]] } });
    const done = play(first.table, "f", 0);
    expect(done.next).toBe(1);
    expect(done.table.piles).toEqual([[5], [KING, NINE, 6]]);
    expect(done.table).toMatchObject({ pot: [[], []], up: [null, null], battles: 1, last: { winner: 1, pot: [[NINE], [KING]], open: [[NINE], [KING]] } });
    expect(play(table([5, NINE], [6, KING]), "f", 0)).toMatchObject({ next: 1 });
  });

  it("counts the ace above the king and ignores the suit", () => {
    expect(both(table([5, ACE], [6, KING])).table.last.winner).toBe(0);
    expect(both(table([5, TWO], [6, NINE])).table.last.winner).toBe(1);
  });

  it("goes to war on a tie: three cards face down and one face up each, the higher taking all ten", () => {
    const tie = both(table([1, 5, 3, 4, ACE, card(0, 8)], [14, 15, 16, 17, TWO, NINE]));
    expect(tie.table).toMatchObject({ war: true, up: [null, null], battles: 0, pot: [[card(0, 8)], [NINE]], last: { winner: null } });
    expect(tie.next).toBe(1);
    const theirs = play(tie.table, "f", 1);
    expect(theirs.table.pot[1]).toEqual([NINE, TWO, 17, 16, 15]);
    expect(theirs.table.open[1]).toEqual([NINE, 15]);
    expect(theirs.table.up[1]).toBe(15);
    const done = play(theirs.table, "f", 0);
    expect(done.table.last.winner).toBe(0);
    expect(done.table.battles).toBe(1);
    expect(done.table.piles[0]).toHaveLength(11);
    expect(done.table.piles[1]).toEqual([14]);
    expect(done.table.piles[0].at(-1)).toBe(1);
  });

  it("lets a player short of cards in a war lay what they have, the last one face up, and beats one with none left", () => {
    const short = both(table([1, 2, 3, 4, 5, NINE], [KING, card(2, 8)]));
    const laid = play(short.table, "f", 1);
    expect(laid.table.pot[1]).toEqual([card(2, 8), KING]);
    expect(laid.table.up[1]).toBe(KING);
    const none = both(table([1, 2, NINE], [card(2, 8)]));
    expect(none.end).toEqual({ winner: 0, reason: "all", cards: [2, 0] });
  });

  it("ends when one player has every card", () => {
    const done = both(table([5, ACE], [KING]));
    expect(done.end).toEqual({ winner: 0, reason: "all", cards: [3, 0] });
  });

  it(`stops after ${LIMIT} battles, the bigger pile winning, equal piles a draw`, () => {
    expect(LIMIT).toBe(40);
    const late = both(table([5, 6, ACE], [7, KING], { battles: LIMIT - 1 }));
    expect(late.end).toEqual({ winner: 0, reason: "limit", cards: [4, 1] });
    const level = both(table([5, 6, 7, TWO], [8, 9, NINE], { battles: LIMIT - 1 }));
    expect(level.end).toEqual({ winner: 1, reason: "limit", cards: [3, 4] });
    const even = both(table([5, 6, 7, ACE], [8, 9, 10, 11, 12, KING], { battles: LIMIT - 1 }));
    expect(even.end).toEqual({ winner: null, reason: "limit", cards: [5, 5] });
  });

  it("refuses anything but turning a card, and a second card before the other side has turned theirs", () => {
    expect(play(table([5], [6]), "g", 1)).toEqual({ error: "bad" });
    const first = play(table([5, 6], [7, 8]), "f", 1);
    expect(play(first.table, "f", 1)).toEqual({ error: "illegal" });
  });

  it("always ends a whole game", () => {
    let seen = deal(DECK);
    let moves = 0;
    while (!seen.end) {
      seen = play(seen.table, "f", seen.next);
      moves += 1;
    }
    expect(moves).toBeLessThanOrEqual(LIMIT * 2 + 60);
    expect(seen.table.piles.flat().length + seen.table.pot.flat().length).toBe(52);
  });
});
