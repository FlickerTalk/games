import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { THEME } from "../src/theme.js";
import { drawAirship, drawCloud, drawRainbowRing, drawWindStream } from "../src/weather.js";

const wide = (ctx) => {
  const { left, right, top, bottom } = bounds(painted(ctx));
  return { w: right - left, h: bottom - top, left, right, top, bottom };
};

describe("what is in the sky", () => {
  it("draws a cloud about as wide as it hides, in the stage's soft colours", () => {
    const ctx = draw((pen) => drawCloud(pen, 200, 200, 120, THEME, { time: 1 }));
    expect(wide(ctx).w).toBeGreaterThan(100);
    expect(wide(ctx).w).toBeLessThan(160);
    expect(colours(ctx)).toContain(THEME.art.weather.cloud);
    expect(ctx.depth).toBe(0);
  });

  it("draws the rainbow ring as six bands round its middle, brighter for a moment when someone flies through", () => {
    const ctx = draw((pen) => drawRainbowRing(pen, 200, 200, 50, THEME, { time: 1 }));
    expect(colours(ctx)).toEqual(expect.arrayContaining(THEME.art.rainbow));
    expect(wide(ctx).w).toBeGreaterThan(90);
    expect(wide(ctx).w).toBeLessThan(115);
    const lit = draw((pen) => drawRainbowRing(pen, 200, 200, 50, THEME, { time: 1, lit: 0.3 }));
    expect(lit.calls.length).toBeGreaterThan(ctx.calls.length);
    expect(ctx.depth + lit.depth).toBe(0);
  });

  it("draws the wind stream as arrows pointing the way it pushes, inside its band", () => {
    const area = { x: 20, y: 100, w: 368, h: 90 };
    const right = draw((pen) => drawWindStream(pen, area, 1, THEME, { time: 0.4 }));
    const left = draw((pen) => drawWindStream(pen, area, -1, THEME, { time: 0.4 }));
    for (const ctx of [right, left]) {
      expect(wide(ctx).top).toBeGreaterThanOrEqual(area.y);
      expect(wide(ctx).bottom).toBeLessThanOrEqual(area.y + area.h);
      expect(ctx.calls.filter((call) => call.op === "closePath").length).toBeGreaterThanOrEqual(3);
      expect(ctx.depth).toBe(0);
    }
    expect(JSON.stringify(right.calls)).not.toBe(JSON.stringify(left.calls));
  });

  it("draws the airship no larger than what the aircraft must fly round", () => {
    const ctx = draw((pen) => drawAirship(pen, 200, 200, 100, THEME, { time: 2 }));
    expect(wide(ctx).w).toBeLessThanOrEqual(112);
    expect(wide(ctx).w).toBeGreaterThan(80);
    expect(colours(ctx)).toContain(THEME.art.airship.body);
    expect(ctx.depth).toBe(0);
  });
});
