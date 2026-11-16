import { describe, expect, it } from "vitest";
import { bounds, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { FAKES } from "../src/duel.js";
import { SIGNAL_REACH } from "../src/layout.js";
import { SIGNALS, drawSignal } from "../src/signals.js";
import { THEME } from "../src/theme.js";

const area = (ctx) => bounds(painted(ctx));

describe("the signals", () => {
  it("are the bell and the three lures, each its own shape", () => {
    expect(SIGNALS).toEqual(["bell", ...FAKES]);
    const seen = new Set(SIGNALS.map((kind) => shapes(draw((pen) => drawSignal(pen, 100, 100, 80, kind, THEME, { progress: 1 }))).join("|")));
    expect(seen.size).toBe(4);
  });

  it("open a sun-burst of twelve rays around the bell only, so it is told apart without colour", () => {
    const strokes = (kind) => draw((pen) => drawSignal(pen, 100, 100, 80, kind, THEME, { progress: 1 })).calls.filter((call) => call.op === "lineTo").length;
    expect(strokes("bell")).toBeGreaterThanOrEqual(strokes("moon") + 12);
    const bell = area(draw((pen) => drawSignal(pen, 100, 100, 80, "bell", THEME, { progress: 1 })));
    const moon = area(draw((pen) => drawSignal(pen, 100, 100, 80, "moon", THEME, { progress: 1 })));
    expect(bell.right - bell.left).toBeGreaterThan((moon.right - moon.left) * 1.3);
  });

  it("stay within their reach, pop open from nothing and draw nothing before they start", () => {
    for (const kind of SIGNALS) {
      for (const progress of [0.1, 0.5, 1]) {
        const ctx = draw((pen) => drawSignal(pen, 100, 100, 80, kind, THEME, { progress, time: 0.4 }));
        const box = area(ctx);
        expect(ctx.depth).toBe(0);
        expect(box.left, kind).toBeGreaterThanOrEqual(100 - 80 * SIGNAL_REACH - 4);
        expect(box.right, kind).toBeLessThanOrEqual(100 + 80 * SIGNAL_REACH + 4);
        expect(box.top, kind).toBeGreaterThanOrEqual(100 - 80 * (SIGNAL_REACH + 0.2) - 4);
        expect(box.bottom, kind).toBeLessThanOrEqual(100 + 80 * SIGNAL_REACH + 4);
      }
      expect(painted(draw((pen) => drawSignal(pen, 100, 100, 80, kind, THEME, { progress: 0 })))).toEqual([]);
    }
    const wide = (progress) => {
      const box = area(draw((pen) => drawSignal(pen, 100, 100, 80, "bell", THEME, { progress })));
      return box.right - box.left;
    };
    expect(wide(0.1)).toBeLessThan(wide(1));
  });
});
