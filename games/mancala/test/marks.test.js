import { describe, expect, it } from "vitest";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawActiveRow, drawCaptureBurst, drawCount, drawLastMark, drawLegalRing, drawPendingClock, drawStoreSparkles } from "../src/marks.js";
import { themeFor } from "../src/theme.js";

const theme = themeFor(null, { dark: false });
const PIT = { x: 100, y: 100, rx: 18, ry: 18 };
const STORE = { x: 100, y: 100, rx: 14, ry: 60 };
const within = (ctx, reach, { x = 100, y = 100 } = {}) => {
  const area = bounds(painted(ctx));
  return area.left >= x - reach && area.right <= x + reach && area.top >= y - reach && area.bottom <= y + reach;
};
const triangles = (ctx) => {
  let found = 0;
  let run = 0;
  for (const call of ctx.calls) {
    if (call.op === "moveTo") run = 1;
    else if (call.op === "lineTo" && run) run += 1;
    else if (call.op === "closePath") {
      if (run === 3) found += 1;
      run = 0;
    }
  }
  return found;
};

describe("the marks on the mancala board", () => {
  it("rings a pit the user may sow with a dashed ring and a notch on the user's side, still from frame to frame", () => {
    const ctx = draw((pen) => drawLegalRing(pen, theme, PIT, 0));
    const dashes = ctx.calls.filter((call) => call.op === "setLineDash").map((call) => call.segments.length);
    expect(dashes[0]).toBeGreaterThan(0);
    expect(dashes.at(-1)).toBe(0);
    expect(triangles(ctx)).toBe(1);
    const notch = bounds(painted(ctx).filter(([, y]) => y > 100 + 18));
    expect(notch.top).toBeGreaterThan(100 + 18);
    expect(within(ctx, 18 * 1.6)).toBe(true);
    expect(ctx.calls.some((call) => call.op === "set" && call.name === "lineDashOffset")).toBe(false);
    expect(ctx.depth).toBe(0);
  });

  it("marks the pit last sown from with a ring inside it and a small circular arrow at its edge", () => {
    const ctx = draw((pen) => drawLastMark(pen, theme, PIT));
    expect(ctx.calls.some((call) => call.op === "arc" && Math.abs(call.to - call.from) < Math.PI * 1.9)).toBe(true);
    expect(within(ctx, 18 * 1.3)).toBe(true);
    expect(ctx.depth).toBe(0);
  });

  it("puts a small clock on a pit whose move waits for the other phone, at its top right", () => {
    const ctx = draw((pen) => drawPendingClock(pen, theme, PIT));
    const area = bounds(painted(ctx));
    expect(area.left).toBeGreaterThan(100);
    expect(area.top).toBeLessThan(100);
    expect(within(ctx, 18 * 1.3)).toBe(true);
  });

  it("writes a count as digits centred on its point, left to right in every language", () => {
    const ctx = draw((pen) => drawCount(pen, theme, "12", 100, 50, 16));
    const text = ctx.calls.find((call) => call.op === "fillText");
    expect(text).toMatchObject({ text: "12", points: [[100, 50]] });
    const set = (name) => ctx.calls.find((call) => call.op === "set" && call.name === name)?.value;
    expect(set("font")).toMatch(/\b16px\b/);
    expect(set("textAlign")).toBe("center");
    expect(set("direction")).toBe("ltr");
    expect(ctx.depth).toBe(0);
  });

  it("outlines the row of the side to move without moving", () => {
    const ctx = draw((pen) => drawActiveRow(pen, theme, { x: 40, y: 80, w: 240, h: 60 }, 1));
    const area = bounds(painted(ctx));
    expect(area.left).toBeGreaterThanOrEqual(40);
    expect(area.right).toBeLessThanOrEqual(280);
    expect(ctx.calls.filter((call) => call.op === "stroke")).toHaveLength(1);
    expect(ctx.calls.some((call) => call.op === "fill")).toBe(false);
  });

  it("bursts a captured pit and sparkles a store only while they last, close to them", () => {
    for (const [effect, shape, reach] of [
      [(ctx, progress) => drawCaptureBurst(ctx, theme, PIT, 1, progress), PIT, 18 * 2.4],
      [(ctx, progress) => drawStoreSparkles(ctx, theme, STORE, progress), STORE, 60 * 1.6],
    ]) {
      expect(draw((ctx) => effect(ctx, 0)).calls).toHaveLength(0);
      expect(draw((ctx) => effect(ctx, 1)).calls).toHaveLength(0);
      const middle = draw((ctx) => effect(ctx, 0.5));
      expect(middle.calls.length).toBeGreaterThan(0);
      expect(within(middle, reach)).toBe(true);
      expect(middle.depth).toBe(0);
    }
  });
});
