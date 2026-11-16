import { describe, expect, it } from "vitest";
import { card } from "../src/card.js";
import { HAND, deal, play } from "../src/fish.js";

const DECK = Array.from({ length: 52 }, (_, at) => (at * 7) % 52);
const four = (rank) => [0, 1, 2, 3].map((suit) => card(suit, rank));
const table = (extra = {}) => ({ hands: [[card(0, 4), card(1, 4), card(0, 9)], [card(2, 4), card(1, 11), card(2, 11)]], pond: [card(3, 9), card(3, 2), card(3, 4)], books: [[], []], last: null, ...extra });

describe("Go Fish", () => {
  it("deals seven cards each and leaves the rest face down as the pond", () => {
    const { table: dealt, next } = deal(DECK);
    expect(HAND).toBe(7);
    expect(dealt.hands.map((hand) => hand.length)).toEqual([7, 7]);
    expect(dealt.hands[1][0]).toBe(DECK[0]);
    expect(dealt.pond).toHaveLength(38);
    expect(dealt.books).toEqual([[], []]);
    expect(next).toBe(1);
  });

  it("lays down at once a book of four dealt to one hand", () => {
    const deck = [...four(3).flatMap((one, at) => [one, 40 + at]), ...DECK.filter((one) => !four(3).includes(one) && (one < 40 || one > 43))];
    const { table: dealt } = deal(deck);
    expect(dealt.books).toEqual([[], [3]]);
    expect(dealt.hands[1]).toHaveLength(3);
  });

  it("hands over every card of the rank asked for, and the asker goes again", () => {
    const asked = play(table(), "a4", 0);
    expect(asked.next).toBe(0);
    expect(asked.table.hands).toEqual([[card(0, 4), card(1, 4), card(0, 9), card(2, 4)], [card(1, 11), card(2, 11)]]);
    expect(asked.table.last).toEqual({ by: 0, rank: 4, got: 1, drew: false, card: null, books: [] });
    expect(asked.table.pond).toHaveLength(3);
  });

  it("sends the asker to the pond when the other has none, and the turn passes", () => {
    const fished = play(table(), "a9", 0);
    expect(fished.next).toBe(1);
    expect(fished.table.hands[0]).toEqual([card(0, 4), card(1, 4), card(0, 9), card(3, 4)]);
    expect(fished.table.pond).toEqual([card(3, 9), card(3, 2)]);
    expect(fished.table.last).toEqual({ by: 0, rank: 9, got: 0, drew: true, card: null, books: [] });
  });

  it("shows a fished card of the rank asked for and gives another turn", () => {
    const lucky = play(table({ pond: [card(3, 2), card(3, 9)] }), "a9", 0);
    expect(lucky.next).toBe(0);
    expect(lucky.table.last).toMatchObject({ got: 0, drew: true, card: card(3, 9) });
  });

  it("lays down four of a rank as a book as soon as a hand holds them", () => {
    const start = table({ hands: [[card(0, 4), card(1, 4), card(3, 4), card(0, 9)], [card(2, 4), card(1, 11)]] });
    const booked = play(start, "a4", 0);
    expect(booked.table.books).toEqual([[4], []]);
    expect(booked.table.hands[0]).toEqual([card(0, 9)]);
    expect(booked.table.last.books).toEqual([4]);
    expect(booked.next).toBe(0);
  });

  it("may only ask for a rank the asker holds", () => {
    expect(play(table(), "a11", 0)).toEqual({ error: "illegal" });
    expect(play(table(), "a13", 0)).toEqual({ error: "bad" });
    expect(play(table(), "d", 0)).toEqual({ error: "illegal" });
    expect(play(table(), "x", 0)).toEqual({ error: "bad" });
  });

  it("has a player with no cards take one from the pond and then ask, or pass when the pond is dry", () => {
    const start = table({ hands: [[card(0, 4), card(1, 4), card(3, 4)], [card(2, 4), card(1, 11)]] });
    const emptied = play(start, "a4", 0);
    expect(emptied.table.hands[0]).toEqual([]);
    expect(emptied.next).toBe(0);
    expect(play(emptied.table, "a4", 0)).toEqual({ error: "illegal" });
    const drawn = play(emptied.table, "d", 0);
    expect(drawn.next).toBe(0);
    expect(drawn.table.hands[0]).toEqual([card(3, 4)]);
    expect(drawn.table.last).toEqual({ by: 0, rank: null, got: 0, drew: true, card: null, books: [] });
    const dry = play({ ...start, pond: [] }, "a4", 0);
    expect(dry.next).toBe(1);
  });

  it("ends with the thirteenth book, more books winning", () => {
    const ranks = [0, 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12];
    const late = table({ hands: [[card(0, 4), card(1, 4), card(3, 4)], [card(2, 4)]], pond: [], books: [ranks.slice(0, 5), ranks.slice(5)] });
    const done = play(late, "a4", 0);
    expect(done.end).toEqual({ winner: 1, reason: "books", books: [6, 7] });
  });

  it("always ends a whole game played by asking for the first card held", () => {
    let seen = deal(DECK);
    let moves = 0;
    while (!seen.end && moves < 2000) {
      const hand = seen.table.hands[seen.next];
      seen = play(seen.table, hand.length ? `a${hand[0] % 13}` : "d", seen.next);
      expect(seen.error).toBeUndefined();
      moves += 1;
    }
    expect(seen.end.books[0] + seen.end.books[1]).toBe(13);
  });
});
