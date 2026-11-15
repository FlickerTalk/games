import { describe, expect, it } from "vitest";
import { rivalPace } from "../../src/progress/rival.js";

const band = { even: 4, full: 24 };

describe("the pace of the rival the phone plays in a race or a chase", () => {
  it("stays as it is while the rival is close to the player", () => {
    for (const gap of [0, 4, -4, 2.5]) expect(rivalPace(gap, band), String(gap)).toBe(1);
  });

  it("slows a rival that is ahead and hurries one that is behind, quietly, by at most a fifth, reached at the full gap", () => {
    expect([14, 24, 100].map((gap) => rivalPace(gap, band))).toEqual([0.9, 0.8, 0.8]);
    expect([-14, -24, -100].map((gap) => rivalPace(gap, band))).toEqual([1.1, 1.2, 1.2]);
  });

  it("takes the game's own limits", () => {
    const wide = { even: 1, full: 3, slowest: 0.5, fastest: 1.5 };
    expect([2, 3, -2, -3].map((gap) => rivalPace(gap, wide))).toEqual([0.75, 0.5, 1.25, 1.5]);
  });

  it("keeps the pace for a gap that is not a number", () => {
    for (const gap of [Number.NaN, undefined, "5"]) expect(rivalPace(gap, band)).toBe(1);
  });

  it("refuses a band that cannot work", () => {
    const broken = [null, {}, { even: -1, full: 4 }, { even: 4, full: 4 }, { even: 4, full: 24, slowest: 1.1 }, { even: 4, full: 24, fastest: 0.9 }];
    for (const wrong of broken) expect(() => rivalPace(10, wrong), JSON.stringify(wrong)).toThrow("band");
  });
});
