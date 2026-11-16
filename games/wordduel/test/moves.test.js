import { describe, expect, it } from "vitest";
import { FLIP_MS, STAGGER_MS, flipAt, flipsOver, newlyAnswered } from "../src/moves.js";

describe("which rows turn over", () => {
  it("are the rows whose answer has just come, in either grid and in the secret word", () => {
    const before = { mine: ["bbybg", ""], theirs: ["ybbbb"], secret: [""] };
    const after = { mine: ["bbybg", "ggggg"], theirs: ["ybbbb", "bbgbb"], secret: ["ggggg"] };
    expect(newlyAnswered(before, after)).toEqual([
      { grid: "mine", row: 1 },
      { grid: "theirs", row: 1 },
      { grid: "secret", row: 0 },
    ]);
  });

  it("are none when nothing new was answered, nothing was seen before, or a new round starts", () => {
    const seen = { mine: ["bbybg"], theirs: [""], secret: [] };
    expect(newlyAnswered(seen, seen)).toEqual([]);
    expect(newlyAnswered(null, seen)).toEqual([]);
    expect(newlyAnswered(seen, { mine: [], theirs: [], secret: [""] })).toEqual([]);
  });
});

describe("a row turning over", () => {
  it("turns its tiles one after the other, from the first letter to the last", () => {
    expect(flipAt(0, 0)).toBe(0);
    expect(flipAt(FLIP_MS / 2, 0)).toBeCloseTo(0.5, 5);
    expect(flipAt(FLIP_MS, 0)).toBe(1);
    expect(flipAt(STAGGER_MS * 4, 4)).toBe(0);
    expect(flipAt(STAGGER_MS * 4 + FLIP_MS, 4)).toBe(1);
    expect(flipAt(FLIP_MS / 4, 0)).toBeLessThan(flipAt(FLIP_MS / 2, 0));
  });

  it("is over once the last tile has turned, in well under a second", () => {
    expect(flipsOver(STAGGER_MS * 4 + FLIP_MS - 1)).toBe(false);
    expect(flipsOver(STAGGER_MS * 4 + FLIP_MS)).toBe(true);
    expect(STAGGER_MS * 4 + FLIP_MS).toBeLessThan(1000);
  });
});
