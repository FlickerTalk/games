import { describe, expect, it } from "vitest";
import { card } from "../src/card.js";
import { HAND, TURNS, deal, play } from "../src/rummy.js";

const DECK = Array.from({ length: 52 }, (_, at) => (at * 7) % 52);
const table = (extra = {}) => ({ hands: [[card(0, 1), card(0, 2), card(0, 3), card(1, 9)], [card(2, 5), card(3, 5), card(1, 5), card(1, 12)]], stock: [40, 41, 42], discard: [card(3, 3)], melds: [], step: "draw", took: null, turns: 0, ...extra });
const go = (start, moves) => moves.reduce((seen, [move, side]) => play(seen.table, move, side), { table: start });

describe("Rummy", () => {
  it("deals seven cards each, the first to the player who did not deal, turns one up and leaves the rest as the stock", () => {
    const { table: dealt, next } = deal(DECK);
    expect(HAND).toBe(7);
    expect(dealt.hands.map((hand) => hand.length)).toEqual([7, 7]);
    expect(dealt.hands[1][0]).toBe(DECK[0]);
    expect(dealt.discard).toEqual([DECK[14]]);
    expect(dealt.stock).toHaveLength(37);
    expect(dealt.stock.at(-1)).toBe(DECK[15]);
    expect(dealt).toMatchObject({ step: "draw", melds: [] });
    expect(next).toBe(1);
  });

  it("starts a turn by taking the top of the stock or the top of the discard pile, and nothing else", () => {
    const stock = play(table(), "ds", 1);
    expect(stock).toMatchObject({ next: 1, table: { step: "play", stock: [40, 41], took: null } });
    expect(stock.table.hands[1].at(-1)).toBe(42);
    const pile = play(table(), "dd", 1);
    expect(pile.table).toMatchObject({ step: "play", discard: [], took: card(3, 3) });
    expect(play(table(), `x${card(1, 12)}`, 1)).toEqual({ error: "illegal" });
    expect(play(table({ discard: [] }), "dd", 1)).toEqual({ error: "illegal" });
    expect(play(stock.table, "ds", 1)).toEqual({ error: "illegal" });
  });

  it("lays a set or a run from the hand face up on the table, any number in a turn", () => {
    const set = go(table(), [["ds", 1], [`m${card(2, 5)}.${card(3, 5)}.${card(1, 5)}`, 1]]);
    expect(set.table.melds).toEqual([[card(1, 5), card(2, 5), card(3, 5)]]);
    expect(set.table.hands[1]).toEqual([card(1, 12), 42]);
    expect(set.next).toBe(1);
    const drawn = play(table(), "ds", 1).table;
    expect(play(drawn, `m${card(2, 5)}.${card(3, 5)}.${card(1, 12)}`, 1)).toEqual({ error: "illegal" });
    expect(play(drawn, `m${card(2, 5)}.${card(3, 5)}.${card(0, 5)}`, 1)).toEqual({ error: "illegal" });
    expect(play(drawn, `m${card(2, 5)}.${card(2, 5)}.${card(3, 5)}`, 1)).toEqual({ error: "illegal" });
    expect(play(drawn, "m1.2", 1)).toEqual({ error: "bad" });
  });

  it("adds a card to any meld on the table where it fits", () => {
    const melded = table({ step: "play", melds: [[card(0, 4), card(0, 5), card(0, 6)]], hands: [[card(0, 3), card(0, 7), card(1, 9)], [card(1, 1)]], next: 0 });
    const added = go(melded, [[`a${card(0, 3)}.0`, 0], [`a${card(0, 7)}.0`, 0]]);
    expect(added.table.melds[0]).toEqual([card(0, 3), card(0, 4), card(0, 5), card(0, 6), card(0, 7)]);
    expect(added.table.hands[0]).toEqual([card(1, 9)]);
    expect(play(melded, `a${card(1, 9)}.0`, 0)).toEqual({ error: "illegal" });
    expect(play(melded, `a${card(0, 3)}.1`, 0)).toEqual({ error: "illegal" });
  });

  it("ends the turn with a discard, which may not be the card just taken from the discard pile", () => {
    const taken = play(table(), "dd", 1).table;
    expect(play(taken, `x${card(3, 3)}`, 1)).toEqual({ error: "illegal" });
    const done = play(taken, `x${card(1, 12)}`, 1);
    expect(done).toMatchObject({ next: 0, table: { step: "draw", discard: [card(1, 12)], took: null, turns: 1 } });
    expect(done.end).toBeUndefined();
  });

  it("is won by the first player with no cards left, by a meld, an added card or the last discard, the other's cards counted", () => {
    const start = table({ step: "play", hands: [[card(0, 1), card(0, 2), card(0, 3), card(1, 9)], [card(1, 12), card(2, 0), card(1, 4)]] });
    const melded = go(start, [[`m${card(0, 1)}.${card(0, 2)}.${card(0, 3)}`, 0], [`x${card(1, 9)}`, 0]]);
    expect(melded.end).toEqual({ winner: 0, reason: "out", points: [0, 16] });
    const clean = play(table({ step: "play", hands: [[card(0, 1), card(0, 2), card(0, 3)], [card(1, 12)]] }), `m${card(0, 1)}.${card(0, 2)}.${card(0, 3)}`, 0);
    expect(clean.end).toEqual({ winner: 0, reason: "out", points: [0, 10] });
    const only = play(table({ step: "play", took: card(1, 9), hands: [[card(1, 9)], [card(1, 12)]] }), `x${card(1, 9)}`, 0);
    expect(only.end).toMatchObject({ winner: 0, reason: "out" });
  });

  it("ends when the stock runs out or after a hundred turns, the lower count in hand winning", () => {
    expect(TURNS).toBe(100);
    const last = go(table({ stock: [42] }), [["ds", 1], [`x${card(1, 12)}`, 1]]);
    expect(last.end).toEqual({ winner: 0, reason: "stock", points: [19, 22] });
    const long = go(table({ turns: TURNS - 1 }), [["ds", 1], [`x${card(1, 12)}`, 1]]);
    expect(long.end).toMatchObject({ reason: "stock" });
    const level = go(table({ stock: [42], hands: [[card(0, 4)], [card(1, 4), card(1, 12)]] }), [["dd", 1], ["x25", 1]]);
    expect(level.end).toBeUndefined();
    const tied = go(table({ stock: [card(0, 0)], hands: [[card(0, 4), card(2, 0)], [card(1, 4), card(1, 12)]] }), [["ds", 1], [`x${card(1, 12)}`, 1]]);
    expect(tied.end).toEqual({ winner: null, reason: "stock", points: [6, 6] });
  });
});
