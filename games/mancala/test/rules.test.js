// The rules of mancala (kalah) as the kit asks for them: six pits of four a side and a store each,
// seeds sown counter-clockwise skipping the other store, the last seed in one's own store gives
// the turn again, in one's own empty pit it captures across, and when the side to move has nothing
// left the other keeps its seeds and the stores are counted.
import { describe, expect, it } from "vitest";
import { PITS, SEEDS, STORE, across, inPits, initial, pitOf, play, result, turn } from "../src/rules.js";

const state = (pits, next = 0) => ({ pits, next });

describe("mancala", () => {
  it("starts with four seeds in each of the twelve pits, the stores empty, side 0 to move", () => {
    expect([PITS, SEEDS, STORE]).toEqual([6, 4, [6, 13]]);
    const start = initial();
    expect(start.pits).toEqual([4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0]);
    expect(turn(start)).toBe(0);
    expect(pitOf(0, 2)).toBe(2);
    expect(pitOf(1, 2)).toBe(9);
    expect(across(2)).toBe(10);
    expect(inPits(start.pits, 1)).toBe(24);
  });

  it("sows the seeds one by one counter-clockwise, and gives the turn to the other side", () => {
    const sown = play(initial(), 0, 0).state;
    expect(sown.pits).toEqual([0, 5, 5, 5, 5, 4, 0, 4, 4, 4, 4, 4, 4, 0]);
    expect(turn(sown)).toBe(1);
    const theirs = play(sown, 0, 1).state;
    expect(theirs.pits.slice(7)).toEqual([0, 5, 5, 5, 5, 4, 0]);
    expect(turn(theirs)).toBe(0);
  });

  it("gives the turn again when the last seed lands in one's own store", () => {
    const again = play(initial(), 2, 0).state;
    expect(again.pits).toEqual([4, 4, 0, 5, 5, 5, 1, 4, 4, 4, 4, 4, 4, 0]);
    expect(turn(again)).toBe(0);
  });

  it("skips the other side's store when going round", () => {
    const loaded = state([0, 0, 0, 0, 0, 10, 0, 1, 1, 1, 1, 1, 1, 0], 0);
    const sown = play(loaded, 5, 0).state;
    // Ten seeds from pit 5: one in the store, six across, none in store 13, then round to pits 0 to
    // 2; the last lands in pit 2, empty until then, and captures the two across in pit 10.
    expect(sown.pits).toEqual([1, 1, 0, 0, 0, 0, 4, 2, 2, 2, 0, 2, 2, 0]);
    expect(turn(sown)).toBe(1);
  });

  it("captures what lies across when the last seed lands in one's own empty pit", () => {
    const set = state([1, 0, 4, 4, 4, 4, 0, 4, 4, 4, 4, 7, 4, 0], 0);
    const taken = play(set, 0, 0).state;
    // The seed lands in pit 1, empty until now; across it, pit 11 holds seven: all eight go to the store.
    expect(taken.pits[1]).toBe(0);
    expect(taken.pits[11]).toBe(0);
    expect(taken.pits[STORE[0]]).toBe(8);
    expect(turn(taken)).toBe(1);
    // Nothing across: no capture, the seed stays.
    const bare = state([1, 0, 4, 4, 4, 4, 0, 4, 4, 4, 4, 0, 4, 0], 0);
    expect(play(bare, 0, 0).state.pits[1]).toBe(1);
    // Landing in the other side's empty pit captures nothing.
    const far = state([0, 0, 0, 0, 0, 2, 0, 0, 4, 4, 4, 4, 4, 0], 0);
    const landed = play(far, 5, 0).state;
    expect(landed.pits[7]).toBe(1);
    expect(landed.pits[STORE[0]]).toBe(1);
  });

  it("refuses an empty pit, a pit that is not one of the six, and a move out of turn", () => {
    expect(play(state([0, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0]), 0, 0)).toEqual({ error: "empty" });
    expect(play(initial(), 6, 0)).toEqual({ error: "bad" });
    expect(play(initial(), -1, 0)).toEqual({ error: "bad" });
    expect(play(initial(), "2", 0)).toEqual({ error: "bad" });
    expect(play(initial(), 2, 1)).toEqual({ error: "turn" });
  });

  it("ends when the side to move has nothing left, the other keeping its seeds, and counts the stores", () => {
    const over = state([0, 0, 0, 0, 0, 0, 20, 1, 2, 3, 0, 0, 0, 22], 0);
    expect(result(over)).toEqual({ winner: 1, first: 20, second: 28 });
    expect(play(over, 0, 0)).toEqual({ error: "over" });
    const even = state([0, 0, 0, 0, 0, 0, 24, 0, 0, 0, 0, 0, 0, 24], 1);
    expect(result(even)).toEqual({ winner: null, first: 24, second: 24 });
    expect(result(initial())).toBeNull();
    // The side that just moved may have emptied its own pits: the game ends when it is their turn with nothing.
    const last = state([0, 0, 0, 0, 0, 1, 23, 0, 0, 0, 0, 0, 0, 24], 0);
    const final = play(last, 5, 0).state;
    expect(turn(final)).toBe(0);
    expect(result(final)).toEqual({ winner: null, first: 24, second: 24 });
  });

  it("never changes the state it is given", () => {
    const start = initial();
    const copy = structuredClone(start);
    play(start, 2, 0);
    expect(start).toEqual(copy);
  });
});
