import { describe, expect, it } from "vitest";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawDisc, sideMark } from "../src/pieces.js";
import { themeFor } from "../src/theme.js";

const theme = themeFor(null, { dark: false });
const R = 20;
const disc = (options) => draw((ctx) => drawDisc(ctx, theme, 100, 100, R, options));
const arcs = (ctx) => ctx.calls.filter((call) => call.op === "arc");
const sized = (ctx, share) => {
  const whole = Math.max(...arcs(ctx).map((call) => call.radius));
  return arcs(ctx).filter((call) => Math.abs(call.radius - whole * share) < whole * 0.005).length;
};
const dots = (ctx) => sized(ctx, 0.1);
const rings = (ctx) => sized(ctx, 0.36);
const width = (ctx) => {
  const area = bounds(painted(ctx));
  return area.right - area.left;
};

describe("a Reversi disc", () => {
  it("tells the sides apart by its mark, not by its shade alone: four dots on the dark one, a ring round a dot on the light one", () => {
    expect([dots(disc({ side: 0 })), rings(disc({ side: 0 }))]).toEqual([4, 0]);
    expect([dots(disc({ side: 1 })), rings(disc({ side: 1 }))]).toEqual([0, 1]);
  });

  it("stays inside its square, its edge showing under it", () => {
    for (const side of [0, 1]) {
      const area = bounds(painted(disc({ side })));
      expect(area.left).toBeGreaterThanOrEqual(100 - R * 1.1);
      expect(area.right).toBeLessThanOrEqual(100 + R * 1.1);
      expect(area.top).toBeGreaterThanOrEqual(100 - R * 1.1);
      expect(area.bottom).toBeLessThanOrEqual(100 + R * 1.2);
      expect(area.bottom - 100).toBeGreaterThan(100 - area.top);
    }
  });

  it("turns over: the face it had until half-way, edge-on in the middle, then its new face", () => {
    expect(dots(disc({ side: 1, flip: 0.25 }))).toBe(4);
    expect(rings(disc({ side: 1, flip: 0.75 }))).toBe(1);
    expect(width(disc({ side: 1, flip: 0.5 }))).toBeLessThan(R * 0.3);
    expect(width(disc({ side: 1, flip: 0.25 }))).toBeLessThan(width(disc({ side: 1, flip: 1 })));
    expect(width(disc({ side: 1, flip: 1 }))).toBeGreaterThan(R * 1.9);
  });

  it("pops onto the board from nothing", () => {
    expect(arcs(disc({ side: 0, pop: 0 }))).toHaveLength(0);
    expect(width(disc({ side: 0, pop: 0.3 }))).toBeLessThan(width(disc({ side: 0, pop: 1 })));
  });

  it("shows faded while its move waits for the other phone, and leaves the context as it found it", () => {
    const faded = disc({ side: 0, alpha: 0.5 });
    expect(faded.calls.filter((call) => call.op === "set" && call.name === "globalAlpha").map((call) => call.value)).toContain(0.5);
    expect(faded.depth).toBe(0);
  });
});

describe("the mark of a side beside a player's name", () => {
  it("is a small drawing of that side's disc, hidden from screen readers", () => {
    const [dark, light] = [sideMark(0), sideMark(1)];
    for (const mark of [dark, light]) {
      expect(mark).toMatch(/^<svg [^>]*aria-hidden="true"/);
      expect(mark).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
    }
    expect(dark.match(/<circle/g)).toHaveLength(7);
    expect(light.match(/<circle/g)).toHaveLength(5);
    expect(light).toContain('fill="none"');
    expect(dark).not.toContain('fill="none"');
  });
});
