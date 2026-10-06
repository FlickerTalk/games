// The rules of Crazy Eights as the kit asks for them: a deck shuffled from two seeds by commit and
// reveal, seven cards each, a card of the suit or rank on the table or an eight that names a suit,
// a draw that passes the turn, passes when the stock is gone, and how a round ends.
import { describe, expect, it } from "vitest";
import { PLAYS } from "../../../preview/shots.js";
import { CARDS, HAND, SUITS, commitText, initial, isEight, play, playable, playableCards, rankOf, result, revealText, seedText, shuffled, suitOf, turn } from "../src/rules.js";

const A = Uint8Array.from({ length: 24 }, (_, at) => at + 1);
const B = new Uint8Array(24).fill(0x5a);
const OPENING = [commitText(A), seedText(B), revealText(A)];

function after(moves, from = initial()) {
  let state = from;
  for (const move of moves) {
    const played = play(state, move, turn(state));
    if (played.error) throw new Error(`${move}: ${played.error}`);
    state = played.state;
  }
  return state;
}

describe("the shuffle", () => {
  it("is a commitment by side 0, a seed by side 1 and a reveal by side 0, then a deal", () => {
    expect(turn(initial())).toBe(0);
    const committed = after([OPENING[0]]);
    expect(turn(committed)).toBe(1);
    expect(committed.phase).toBe("shuffle");
    const seeded = after(OPENING.slice(0, 2));
    expect(turn(seeded)).toBe(0);
    const dealt = after(OPENING);
    expect(dealt.phase).toBe("play");
    expect(dealt.hands[0]).toHaveLength(HAND);
    expect(dealt.hands[1]).toHaveLength(HAND);
    expect(dealt.pile).toHaveLength(1);
    expect(dealt.stock).toHaveLength(CARDS - 2 * HAND - 1);
    expect(dealt.suit).toBe(suitOf(dealt.pile[0]));
    expect(turn(dealt)).toBe(1, "the non-dealer plays first");
    const all = [...dealt.hands[0], ...dealt.hands[1], ...dealt.pile, ...dealt.stock].sort((a, b) => a - b);
    expect(all).toEqual(Array.from({ length: CARDS }, (_, card) => card));
  });

  it("orders the deck from both seeds, the same every time, differently for other seeds", () => {
    const one = shuffled(A, B);
    expect(one).toHaveLength(52);
    expect([...one].sort((a, b) => a - b)).toEqual(Array.from({ length: 52 }, (_, card) => card));
    expect(shuffled(A, B)).toEqual(one);
    expect(shuffled(B, A)).not.toEqual(one);
    expect(shuffled(A, new Uint8Array(24))).not.toEqual(one);
    expect(one).not.toEqual(Array.from({ length: 52 }, (_, card) => card));
  });

  it("refuses what is not its move, and gives the round to side 1 when the dealer reveals another seed", () => {
    expect(play(initial(), "p0", 0)).toEqual({ error: "bad" });
    expect(play(initial(), "cshort", 0)).toEqual({ error: "bad" });
    expect(play(initial(), OPENING[0], 1)).toEqual({ error: "turn" });
    const committed = after([OPENING[0]]);
    expect(play(committed, OPENING[0], 1)).toEqual({ error: "bad" });
    expect(play(committed, "sshort", 1)).toEqual({ error: "bad" });
    const seeded = after(OPENING.slice(0, 2));
    expect(play(seeded, seedText(A), 0)).toEqual({ error: "bad" });
    const cheated = after([revealText(B)], seeded);
    expect(cheated.phase).toBe("done");
    expect(result(cheated)).toEqual({ winner: 1, reason: "cheat" });
    expect(play(cheated, "d", 1)).toEqual({ error: "over" });
  });
});

describe("a card", () => {
  it("has a suit and a rank, and an eight is wild", () => {
    expect(suitOf(0)).toBe(0);
    expect(rankOf(0)).toBe(0);
    expect(suitOf(51)).toBe(3);
    expect(rankOf(51)).toBe(12);
    expect(isEight(7)).toBe(true);
    expect(isEight(20)).toBe(true);
    expect(isEight(8)).toBe(false);
    expect(SUITS).toEqual(["s", "h", "d", "c"]);
  });

  it("may go on the table when it follows the suit or the rank, or is an eight", () => {
    // Nine of spades on the table, spades to follow.
    const state = { ...after(OPENING), pile: [8], suit: 0 };
    expect(playable(state, 0)).toBe(true, "ace of spades: the suit");
    expect(playable(state, 21)).toBe(true, "nine of hearts: the rank");
    expect(playable(state, 33)).toBe(true, "eight of diamonds");
    expect(playable(state, 14)).toBe(false, "two of hearts");
    // After an eight named hearts, hearts follow whatever the eight's own suit.
    const named = { ...state, pile: [8, 33], suit: 1 };
    expect(playable(named, 14)).toBe(true);
    expect(playable(named, 0)).toBe(false);
    expect(playable(named, 34)).toBe(false, "nine of diamonds: not the suit named, and the eight on the table has another rank");
  });
});

describe("a turn", () => {
  const dealt = after(OPENING);

  it("plays a card from the hand that follows, and the turn passes", () => {
    const side = turn(dealt);
    const cards = playableCards(dealt, side);
    if (cards.length) {
      const card = cards.find((one) => !isEight(one)) ?? cards[0];
      const move = isEight(card) ? `p${card}h` : `p${card}`;
      const next = after([move], dealt);
      expect(next.hands[side]).not.toContain(card);
      expect(next.pile.at(-1)).toBe(card);
      expect(next.suit).toBe(isEight(card) ? 1 : suitOf(card));
      expect(turn(next)).toBe(1 - side);
    }
    expect(playableCards(initial(), 0)).toEqual([]);
  });

  it("refuses a card not in the hand, one that does not follow, an eight without a suit, or a plain card with one", () => {
    const side = turn(dealt);
    const other = dealt.hands[1 - side][0];
    expect(play(dealt, `p${other}`, side)).toEqual({ error: "illegal" });
    expect(play(dealt, "p52", side)).toEqual({ error: "bad" });
    expect(play(dealt, "p", side)).toEqual({ error: "bad" });
    // A state set up by hand: side 1 holds the ace of spades, the eight of hearts and the two of hearts; nine of spades on the table.
    const state = { ...dealt, hands: [[1, 2, 3], [0, 20, 14]], pile: [8], suit: 0, next: 1 };
    expect(play(state, "p14", 1)).toEqual({ error: "illegal" });
    expect(play(state, "p20", 1)).toEqual({ error: "illegal" }, "an eight names a suit");
    expect(play(state, "p0h", 1)).toEqual({ error: "illegal" }, "only an eight names a suit");
    expect(play(state, "p20x", 1)).toEqual({ error: "bad" });
    expect(play(state, "p0", 1).state.hands[1]).toEqual([20, 14]);
    const eight = play(state, "p20d", 1).state;
    expect(eight.suit).toBe(2);
    expect(eight.pile.at(-1)).toBe(20);
  });

  it("draws one card from the stock, and the turn passes; passes only with the stock gone", () => {
    const side = turn(dealt);
    const drawn = after(["d"], dealt);
    expect(drawn.hands[side]).toHaveLength(HAND + 1);
    expect(drawn.stock).toHaveLength(dealt.stock.length - 1);
    expect(drawn.hands[side].at(-1)).toBe(dealt.stock.at(-1));
    expect(turn(drawn)).toBe(1 - side);
    expect(play(dealt, "x", side)).toEqual({ error: "illegal" });
    const empty = { ...dealt, stock: [] };
    expect(play(empty, "d", side)).toEqual({ error: "illegal" });
    const passed = play(empty, "x", side).state;
    expect(passed.passes).toBe(1);
    expect(turn(passed)).toBe(1 - side);
    expect(result(passed)).toBeNull();
  });
});

describe("the end of a round", () => {
  it("is won by the side that plays its last card", () => {
    const state = { ...after(OPENING), hands: [[1, 2], [8]], pile: [21], suit: 1, next: 1 };
    const won = play(state, "p8", 1).state;
    expect(result(won)).toEqual({ winner: 1, reason: "out" });
    expect(play(won, "d", 0)).toEqual({ error: "over" });
  });

  it("ends after two passes with the stock gone: fewer cards win, as many is a draw", () => {
    const state = { ...after(OPENING), hands: [[1, 2, 3], [8, 9]], pile: [21], suit: 1, next: 0, stock: [], passes: 0 };
    const twice = after(["x", "x"], state);
    expect(result(twice)).toEqual({ winner: 1, reason: "stuck", cards: [3, 2] });
    const even = { ...state, hands: [[1, 2], [8, 9]] };
    expect(result(after(["x", "x"], even))).toEqual({ winner: null, reason: "stuck", cards: [2, 2] });
    // A play in between starts the count again.
    const broken = after(["x", "p8", "x"], { ...state, hands: [[1, 2, 3], [8, 9]] });
    expect(result(broken)).toBeNull();
    expect(broken.passes).toBe(1);
  });

  it("plays the screenshot lines out: the starter wins one, the other is a draw", () => {
    const { opening, winning, draw } = PLAYS.eights;
    expect(result(after(opening))).toBeNull();
    expect(result(after([...opening, ...winning]))).toEqual({ winner: 0, reason: "out" });
    expect(result(after(draw))).toMatchObject({ winner: null, reason: "stuck" });
  });

  it("never changes the state it is given", () => {
    const state = after(OPENING);
    const copy = structuredClone(state);
    play(state, "d", turn(state));
    expect(state).toEqual(copy);
  });
});
