import { describe, expect, it } from "vitest";
import { candidatesFor, decodeTries, encodeTries, openGaps, replayTries, solved, startPuzzle, tryWagon } from "../src/puzzle.js";
import { beatsOf, kindOf, makeTrain, wagonOf } from "../src/train.js";

const [A, B, C] = [wagonOf(0, 1), wagonOf(1, 1), wagonOf(2, 1)];
const TRAIN = makeTrain([A, B, A, B, A, B], [3, 5]);

describe("the siding", () => {
  it("always holds every wagon the train is missing, once each, among wagons that do not fit", () => {
    for (const seed of ["one", "two", "three", "four"]) {
      const four = candidatesFor(TRAIN, seed, 4);
      expect(four).toHaveLength(4);
      expect(new Set(four).size).toBe(4);
      expect(four).toContain(B);
    }
    const mixed = makeTrain([A, B, C, A, B, C], [1, 5]);
    expect(candidatesFor(mixed, "seed", 3)).toEqual(expect.arrayContaining([B, C]));
  });

  it("is the same on both phones for the same train and seed, and not always in the same order", () => {
    expect(candidatesFor(TRAIN, "seed", 4)).toEqual(candidatesFor(TRAIN, "seed", 4));
    const firsts = new Set(["a", "b", "c", "d", "e", "f", "g", "h"].map((seed) => candidatesFor(TRAIN, seed, 4).indexOf(B)));
    expect(firsts.size).toBeGreaterThan(1);
  });

  it("tempts with the same instrument on another beat once the train counts beats", () => {
    const beats = makeTrain([A, wagonOf(0, 2), A, wagonOf(0, 2)], [3]);
    const offered = candidatesFor(beats, "seed", 4);
    expect(offered.filter((wagon) => kindOf(wagon) === 0 && beatsOf(wagon) !== 2).length).toBeGreaterThanOrEqual(1);
  });
});

describe("completing a train", () => {
  it("puts a wagon in the first open gap when none is named, and keeps only the right one", () => {
    let puzzle = startPuzzle(TRAIN);
    expect(openGaps(puzzle)).toEqual([3, 5]);
    const wrong = tryWagon(puzzle, C);
    expect(wrong).toMatchObject({ right: false, gap: 3 });
    expect(openGaps(wrong.puzzle)).toEqual([3, 5]);
    const right = tryWagon(wrong.puzzle, B);
    expect(right).toMatchObject({ right: true, gap: 3 });
    puzzle = tryWagon(right.puzzle, B, 5).puzzle;
    expect(solved(puzzle)).toBe(true);
    expect(puzzle.tries).toEqual([C, B, B]);
    expect(puzzle.wrongs).toBe(1);
  });

  it("ignores a wagon aimed at a gap that is not open", () => {
    const puzzle = startPuzzle(TRAIN);
    expect(tryWagon(puzzle, B, 0)).toMatchObject({ right: false, gap: null });
    expect(tryWagon(puzzle, B, 0).puzzle).toBe(puzzle);
  });
});

describe("what the solver sends back", () => {
  it("is the wagons tried, in order, and replays to a finished train", () => {
    expect(encodeTries([C, B, B])).toBe("Sgdd");
    expect(decodeTries("Sgdd")).toEqual([C, B, B]);
    expect(replayTries(TRAIN, [C, B, B])).toMatchObject({ wrongs: 1 });
  });

  it("is refused when it does not finish the train, goes on after it, or is too long", () => {
    expect(replayTries(TRAIN, [B])).toBeNull();
    expect(replayTries(TRAIN, [B, B, B])).toBeNull();
    expect(replayTries(TRAIN, [...Array(40).fill(C), B, B])).toBeNull();
    for (const bad of ["", "S", "Sz", "Xdd", 5, null]) expect(decodeTries(bad), String(bad)).toBeNull();
  });
});
