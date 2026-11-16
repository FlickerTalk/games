import { describe, expect, it } from "vitest";
import { bounds, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { drawSeed, drawSeeds, sideMark } from "../src/pieces.js";
import { themeFor } from "../src/theme.js";

const theme = themeFor(null, { dark: false });
const pebbles = (ctx) => ctx.calls.filter((call) => call.op === "bezierCurveTo").length / 3;
const widthOf = (ctx) => {
  const area = bounds(painted(ctx));
  return area.right - area.left;
};

describe("a mancala seed", () => {
  it("is a smooth pebble around its point, no wider than its size", () => {
    const ctx = draw((pen) => drawSeed(pen, theme, 100, 100, 20, 3));
    expect(pebbles(ctx)).toBe(1);
    const area = bounds(painted(ctx));
    expect(area.left).toBeGreaterThanOrEqual(100 - 20 * 0.7);
    expect(area.right).toBeLessThanOrEqual(100 + 20 * 0.7);
    expect(area.top).toBeGreaterThanOrEqual(100 - 20 * 0.7);
    expect(area.bottom).toBeLessThanOrEqual(100 + 20 * 0.7);
    expect(ctx.depth).toBe(0);
  });

  it("keeps the same shape for the same seed from frame to frame, and turns a little from one seed to the next", () => {
    const seed = (index) => shapes(draw((ctx) => drawSeed(ctx, theme, 100, 100, 20, index)));
    expect(seed(2)).toEqual(seed(2));
    expect(seed(2)).not.toEqual(seed(3));
  });
});

describe("the seeds in a pit", () => {
  it("shows each seed up to nine, and nothing in an empty pit", () => {
    for (const count of [0, 1, 4, 6, 9]) expect(pebbles(draw((ctx) => drawSeeds(ctx, theme, 100, 100, 20, 20, count))), `${count}`).toBe(count);
    expect(pebbles(draw((ctx) => drawSeeds(ctx, theme, 100, 100, 20, 20, 23)))).toBe(9);
  });

  it("keeps every seed inside the hollow, smaller ones when there are many", () => {
    for (const count of [1, 6, 7, 30]) {
      const area = bounds(painted(draw((ctx) => drawSeeds(ctx, theme, 100, 100, 16, 24, count))));
      expect(area.left, `${count}`).toBeGreaterThanOrEqual(100 - 16 * 1.25);
      expect(area.right, `${count}`).toBeLessThanOrEqual(100 + 16 * 1.25);
      expect(area.top, `${count}`).toBeGreaterThanOrEqual(100 - 24 * 1.25);
      expect(area.bottom, `${count}`).toBeLessThanOrEqual(100 + 24 * 1.25);
    }
    const firstPebble = (count) => {
      const { calls } = draw((pen) => drawSeeds(pen, theme, 100, 100, 20, 20, count));
      const start = calls.findIndex((call) => call.op === "moveTo");
      return widthOf({ calls: calls.slice(start, start + 4) });
    };
    expect(firstPebble(9)).toBeLessThan(firstPebble(4));
  });
});

describe("the mark of a side beside a player's name", () => {
  it("is the side's round or diamond marker, hidden from screen readers", () => {
    const [round, diamond] = [sideMark(0), sideMark(1)];
    expect(round).not.toBe(diamond);
    for (const mark of [round, diamond]) {
      expect(mark).toMatch(/^<svg [^>]*aria-hidden="true"/);
      expect(mark).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
    }
    expect(round.match(/<circle/g)).toHaveLength(2);
    expect(round).not.toContain("<polygon");
    expect(diamond.match(/<polygon/g)).toHaveLength(2);
    expect(diamond).not.toContain("<circle");
  });
});
