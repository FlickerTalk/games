import { describe, expect, it } from "vitest";
import { sameKind } from "../src/card.js";
import { SIZES, deal, play } from "../src/pairs.js";

const DECK = Array.from({ length: 52 }, (_, at) => (at * 7) % 52);
const go = (table, moves) => moves.reduce((seen, [move, side]) => play(seen.table, move, side), { table });
const partner = (table, at) => table.cards.findIndex((one, other) => other !== at && sameKind(one, table.cards[at]));
const stranger = (table, at) => table.cards.findIndex((one, other) => other !== at && !sameKind(one, table.cards[at]));

describe("Pairs", () => {
  it("lays out sixteen or twenty-four cards face down, every one with its partner of the same rank and colour, in the deck's order", () => {
    expect(SIZES).toEqual([16, 24]);
    for (const size of SIZES) {
      const { table, next } = deal(DECK, size);
      expect(table.cards).toHaveLength(size);
      expect(new Set(table.cards).size).toBe(size);
      for (const at of table.cards.keys()) expect(partner(table, at)).toBeGreaterThanOrEqual(0);
      expect(table.cards).toEqual(DECK.filter((one) => table.cards.includes(one)));
      expect(table.owner.every((one) => one === null)).toBe(true);
      expect(next).toBe(1);
    }
  });

  it("keeps a pair for the player who turned it and lets them go again", () => {
    const { table } = deal(DECK, 16);
    const first = play(table, "f0", 1);
    expect(first).toMatchObject({ next: 1, table: { up: [0] } });
    const second = play(first.table, `f${partner(table, 0)}`, 1);
    expect(second.next).toBe(1);
    expect(second.table.up).toEqual([]);
    expect(second.table.won).toEqual([0, 1]);
    expect(second.table.owner[0]).toBe(1);
    expect(second.table.took).toEqual([0, partner(table, 0)]);
  });

  it("leaves a miss face up for the other player to see, who turns it back with their first card", () => {
    const { table } = deal(DECK, 16);
    const other = stranger(table, 0);
    const missed = go(table, [["f0", 1], [`f${other}`, 1]]);
    expect(missed).toMatchObject({ next: 0, table: { up: [0, other], miss: true, won: [0, 0] } });
    const free = table.cards.findIndex((_, at) => at !== 0 && at !== other);
    const after = play(missed.table, `f${free}`, 0);
    expect(after.table).toMatchObject({ up: [free], miss: false });
    expect(after.table.seen).toEqual([0, other, free]);
    expect(play(missed.table, "f0", 0).table.up).toEqual([0]);
  });

  it("refuses a card that is gone, already face up, off the table or badly written", () => {
    const { table } = deal(DECK, 16);
    const taken = go(table, [["f0", 1], [`f${partner(table, 0)}`, 1]]).table;
    expect(play(taken, "f0", 1)).toEqual({ error: "illegal" });
    expect(play(play(table, "f3", 1).table, "f3", 1)).toEqual({ error: "illegal" });
    expect(play(table, "f16", 1)).toEqual({ error: "illegal" });
    for (const move of ["f", "x3", "f-1", "f003"]) expect(play(table, move, 1)).toEqual({ error: "bad" });
  });

  it("ends when the last pair is taken: more pairs win, the same number is a draw", () => {
    let seen = deal(DECK, 16);
    let side = 1;
    while (!seen.end) {
      const at = seen.table.owner.findIndex((one) => one === null);
      seen = go(seen.table, [[`f${at}`, side], [`f${partner(seen.table, at)}`, side]]);
    }
    expect(seen.end).toEqual({ winner: 1, reason: "pairs", pairs: [0, 8] });
    const level = deal(DECK, 16).table;
    const owner = level.owner.map(() => 0);
    const [a, b] = [0, partner(level, 0)];
    owner[a] = null;
    owner[b] = null;
    const drawn = go({ ...level, owner, won: [7, 0] }, [[`f${a}`, 1], [`f${b}`, 1]]);
    expect(drawn.end).toEqual({ winner: 0, reason: "pairs", pairs: [7, 1] });
    const tied = go({ ...level, owner, won: [3, 4] }, [[`f${a}`, 0], [`f${b}`, 0]]);
    expect(tied.end).toEqual({ winner: null, reason: "pairs", pairs: [4, 4] });
  });
});
