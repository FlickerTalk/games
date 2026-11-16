import { describe, expect, it } from "vitest";
import { DEAL_MS, DEAL_STEP_MS, PLAY_MS, SUIT_MS, cueTimes, moveFrame, planMove } from "../src/moves.js";
import { HAND, commitText, initial, play, revealText, seedText, turn } from "../src/rules.js";

const A = Uint8Array.from({ length: 24 }, (_, at) => at + 1);
const B = new Uint8Array(24).fill(0x5a);
const replay = (moves, start = initial()) => moves.reduce((state, move) => play(state, move, turn(state)).state, start);
const seeded = replay([commitText(A), seedText(B)]);
const dealt = replay([revealText(A)], seeded);
const table = { ...dealt, hands: [[1, 2, 3], [0, 20, 14, 35]], pile: [8], suit: 0, next: 1, stock: [40, 41], passes: 0 };
const after = (state, move) => play(state, move, turn(state)).state;

describe("how a move of crazy eights is shown", () => {
  it("flies a played card from its place in the user's hand to the pile", () => {
    const plan = planMove(table, after(table, "p0"), "p0", 1);
    expect(plan).toEqual({ kind: "play", side: 1, mine: true, card: 0, from: 0, eight: false });
    const other = planMove({ ...table, next: 0 }, after({ ...table, next: 0 }, "p3"), "p3", 1);
    expect(other).toMatchObject({ kind: "play", side: 0, mine: false, card: 3, from: null });
  });

  it("shows the suit an eight names once the eight has landed", () => {
    const plan = planMove(table, after(table, "p20h"), "p20h", 1);
    expect(plan).toMatchObject({ kind: "play", card: 20, eight: true });
    expect(moveFrame(plan, PLAY_MS / 2).suit).toBe(0);
    expect(moveFrame(plan, PLAY_MS + SUIT_MS / 2).suit).toBeCloseTo(0.5, 5);
    expect(moveFrame(plan, PLAY_MS + SUIT_MS + 1).done).toBe(true);
  });

  it("draws a card from the stock as a back, naming it only when it is the user's own", () => {
    expect(planMove(table, after(table, "d"), "d", 1)).toEqual({ kind: "draw", side: 1, mine: true, card: 41 });
    const theirs = planMove(table, after(table, "d"), "d", 0);
    expect(theirs).toEqual({ kind: "draw", side: 1, mine: false, card: null });
  });

  it("passes, and deals the hands when the shuffle is revealed", () => {
    const empty = { ...table, stock: [] };
    expect(planMove(empty, after(empty, "x"), "x", 1)).toEqual({ kind: "pass", side: 1, mine: true });
    expect(planMove(seeded, dealt, revealText(A), 0)).toEqual({ kind: "deal", count: HAND * 2 });
    expect(moveFrame({ kind: "deal", count: HAND * 2 }, DEAL_MS / 2).dealt).toBeGreaterThan(0);
    expect(moveFrame({ kind: "deal", count: HAND * 2 }, DEAL_MS + 1).done).toBe(true);
  });

  it("shows nothing moving when the new position does not follow from the old one by that move", () => {
    expect(planMove(table, after(table, "p0"), "p20h", 1)).toBeNull();
    expect(planMove(table, table, "d", 1)).toBeNull();
    expect(planMove(null, table, "d", 1)).toBeNull();
    expect(planMove(table, after(table, "d"), null, 1)).toBeNull();
  });

  it("travels for a tap and lands at once for a card dropped by a finger", () => {
    const plan = planMove(table, after(table, "p0"), "p0", 1);
    expect(moveFrame(plan, PLAY_MS / 2).progress).toBeCloseTo(0.5, 5);
    expect(moveFrame(plan, 0, { travel: false })).toMatchObject({ progress: 1, done: true });
  });

  it("sounds a card as it lands, a draw as it leaves the stock and a deal as it starts", () => {
    const plan = planMove(table, after(table, "p0"), "p0", 1);
    expect(cueTimes(plan)).toEqual([{ cue: "card", at: PLAY_MS }]);
    expect(cueTimes(plan, { travel: false })).toEqual([{ cue: "card", at: 0 }]);
    expect(cueTimes(planMove(table, after(table, "d"), "d", 0))).toEqual([{ cue: "draw", at: 0 }]);
    expect(cueTimes({ kind: "deal", count: HAND * 2 })).toEqual([{ cue: "deal", at: 0 }, { cue: "card", at: HAND * 2 * DEAL_STEP_MS }]);
    expect(cueTimes({ kind: "pass", side: 0, mine: false })).toEqual([]);
  });
});
