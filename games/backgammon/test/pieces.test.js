import { describe, expect, it } from "vitest";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawChecker, drawStackCount, sideMark } from "../src/pieces.js";
import { themeFor } from "../src/theme.js";

const theme = themeFor(null, { dark: false });
const checker = (options) => draw((ctx) => drawChecker(ctx, theme, 100, 100, 20, options));
const polygons = (ctx, corners) => {
  let found = 0;
  let run = 0;
  for (const call of ctx.calls) {
    if (call.op === "moveTo") run = 1;
    else if (call.op === "lineTo" && run) run += 1;
    else if (call.op === "closePath") {
      if (run === corners) found += 1;
      run = 0;
    }
  }
  return found;
};
const bars = (ctx) => {
  const drawn = ctx.calls.filter((call) => call.op !== "set");
  return drawn.filter((call, at) => call.op === "moveTo" && drawn[at + 1]?.op === "lineTo" && drawn[at + 2]?.op === "stroke" && Math.abs(call.points[0][1] - drawn[at + 1].points[0][1]) < 0.01).length;
};

describe("a backgammon checker", () => {
  it("tells the sides apart by its mark as well as its colour: a diamond on the ivory, two bars on the oxblood", () => {
    expect(polygons(checker({ side: 0 }), 4)).toBe(1);
    expect(bars(checker({ side: 0 }))).toBe(0);
    expect(polygons(checker({ side: 1 }), 4)).toBe(0);
    expect(bars(checker({ side: 1 }))).toBe(2);
    expect(checker({ side: 0 }).depth + checker({ side: 1 }).depth).toBe(0);
  });

  it("stays inside its circle and the thin edge under it, lifted or not", () => {
    for (const lift of [0, 6]) {
      const area = bounds(painted(checker({ side: 1, lift })));
      expect(area.left).toBeGreaterThanOrEqual(100 - 20 * 1.1);
      expect(area.right).toBeLessThanOrEqual(100 + 20 * 1.1);
      expect(area.top).toBeGreaterThanOrEqual(100 - 20 * 1.1 - lift);
      expect(area.bottom).toBeLessThanOrEqual(100 + 20 * 1.2 - lift);
    }
  });

  it("shows faded while its move waits for the other phone", () => {
    const alphas = checker({ side: 0, alpha: 0.5 }).calls.filter((call) => call.op === "set" && call.name === "globalAlpha").map((call) => call.value);
    expect(alphas).toContain(0.5);
  });

  it("counts a tall stack on its last checker, in digits as large as the checker allows", () => {
    const ctx = draw((pen) => drawStackCount(pen, theme, 100, 100, 20, 11));
    const text = ctx.calls.find((call) => call.op === "fillText");
    expect(text.text).toBe("11");
    expect(text.points[0]).toEqual([100, 100]);
    const font = ctx.calls.filter((call) => call.op === "set" && call.name === "font").at(-1).value;
    expect(Number(/(\d+(?:\.\d+)?)px/.exec(font)[1])).toBeGreaterThanOrEqual(20);
    expect(ctx.depth).toBe(0);
  });
});

describe("the mark of a side beside a player's name", () => {
  it("is a small drawing of that side's checker, hidden from screen readers", () => {
    const [ivory, oxblood] = [sideMark(0), sideMark(1)];
    expect(ivory).not.toBe(oxblood);
    for (const mark of [ivory, oxblood]) {
      expect(mark).toMatch(/^<svg [^>]*aria-hidden="true"/);
      expect(mark).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
    }
    expect(ivory).toContain("<polygon");
    expect(oxblood).not.toContain("<polygon");
    expect(oxblood.match(/<line /g)).toHaveLength(2);
  });
});
