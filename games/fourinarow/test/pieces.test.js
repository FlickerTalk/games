import { describe, expect, it } from "vitest";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawDisc, sideMark } from "../src/pieces.js";
import { themeFor } from "../src/theme.js";

const theme = themeFor(null, { dark: false });
const disc = (options) => draw((ctx) => drawDisc(ctx, theme, 100, 100, 20, options));
const strokes = (ctx) => {
  const found = [];
  let path = [];
  for (const call of ctx.calls) {
    if (call.op === "beginPath") path = [];
    else if (call.op === "moveTo" || call.op === "lineTo" || call.op === "arc") path.push(call);
    else if (call.op === "stroke") found.push(path);
  }
  return found;
};
const bars = (ctx) => strokes(ctx).filter((path) => path.length === 2 && path.every((call) => call.op !== "arc"));
const rings = (ctx, radius) => strokes(ctx).filter((path) => path.length === 1 && path[0].op === "arc" && path[0].to - path[0].from >= Math.PI * 2 - 1e-6 && Math.abs(path[0].radius - radius) < radius * 0.08);
const width = (ctx) => {
  const area = bounds(painted(ctx));
  return area.right - area.left;
};

describe("a Four in a Row disc", () => {
  it("wears a cross on one side and a ring on the other, so the sides differ by shape and not by colour alone", () => {
    const [cross, ring] = [disc({ side: 0 }), disc({ side: 1 })];
    expect(bars(cross)).toHaveLength(2);
    expect(rings(cross, 5)).toHaveLength(0);
    expect(bars(ring)).toHaveLength(0);
    expect(rings(ring, 5)).toHaveLength(1);
    for (const ctx of [cross, ring]) expect(ctx.depth).toBe(0);
  });

  it("crosses its two bars at the centre of the disc", () => {
    for (const [from, to] of bars(disc({ side: 0 }))) {
      expect((from.points[0][0] + to.points[0][0]) / 2).toBeCloseTo(100, 6);
      expect((from.points[0][1] + to.points[0][1]) / 2).toBeCloseTo(100, 6);
    }
  });

  it("stays inside its hole, and a winning disc wears one more ring just around it", () => {
    const plain = bounds(painted(disc({ side: 1 })));
    expect(plain.left).toBeGreaterThanOrEqual(100 - 20 * 1.06);
    expect(plain.right).toBeLessThanOrEqual(100 + 20 * 1.06);
    expect(plain.top).toBeGreaterThanOrEqual(100 - 20 * 1.06);
    expect(plain.bottom).toBeLessThanOrEqual(100 + 20 * 1.06);
    const winning = disc({ side: 0, ring: true });
    expect(rings(winning, 23)).toHaveLength(1);
    expect(width(winning)).toBeLessThanOrEqual(20 * 2 * 1.25);
  });

  it("grows a little while it pulses, and shows faded while its move waits for the other phone", () => {
    expect(width(disc({ side: 0, scale: 1.05 }))).toBeGreaterThan(width(disc({ side: 0 })));
    const faded = disc({ side: 0, alpha: 0.5 });
    expect(faded.calls.filter((call) => call.op === "set" && call.name === "globalAlpha").map((call) => call.value)).toContain(0.5);
  });

  it("gets a light rim round its outline when it is held over a dark page", () => {
    const strokeColours = (ctx) => ctx.calls.filter((call) => call.op === "set" && call.name === "strokeStyle").map((call) => call.value);
    expect(strokeColours(disc({ side: 0, rim: "#cccccc" }))).toContain("#cccccc");
    expect(strokeColours(disc({ side: 0 }))).not.toContain("#cccccc");
  });
});

describe("the mark of a side beside a player's name", () => {
  it("is a small drawing of that side's disc, its cross or its ring, hidden from screen readers", () => {
    const [cross, ring] = [sideMark(0), sideMark(1)];
    expect(cross).not.toBe(ring);
    for (const mark of [cross, ring]) {
      expect(mark).toMatch(/^<svg [^>]*aria-hidden="true"/);
      expect(mark).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
    }
    expect(cross).toMatch(/<path d="M[^"]*M[^"]*"[^>]*stroke-linecap="round"/);
    expect(ring.match(/<circle/g)).toHaveLength(2);
    expect(ring).toMatch(/<circle r="[\d.]+" fill="none"/);
    expect(cross.match(/<circle/g)).toHaveLength(1);
  });
});
