import { describe, expect, it } from "vitest";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawClaimedBox, drawEmblem, drawLine, sideMark, strokeOf } from "../src/pieces.js";
import { themeFor } from "../src/theme.js";

const theme = themeFor(null, { dark: false });
const count = (ctx, op) => ctx.calls.filter((call) => call.op === op).length;
const widthOf = (ctx) => {
  const area = bounds(painted(ctx));
  return area.right - area.left;
};

describe("the mark of a side", () => {
  it("is a cross for the side that draws X and a ring for the side that draws O, so the sides differ by shape", () => {
    const cross = draw((ctx) => drawEmblem(ctx, theme, 100, 100, 40, 0));
    const ring = draw((ctx) => drawEmblem(ctx, theme, 100, 100, 40, 1));
    expect(count(cross, "arc")).toBe(0);
    expect(count(cross, "lineTo")).toBeGreaterThanOrEqual(2);
    expect(count(ring, "arc")).toBeGreaterThanOrEqual(1);
    expect(count(ring, "lineTo")).toBe(0);
    expect(cross.depth + ring.depth).toBe(0);
  });

  it("stays inside the size it is given", () => {
    for (const side of [0, 1]) {
      const area = bounds(painted(draw((ctx) => drawEmblem(ctx, theme, 100, 100, 40, side))));
      expect(area.left, `side ${side}`).toBeGreaterThanOrEqual(80);
      expect(area.right, `side ${side}`).toBeLessThanOrEqual(120);
      expect(area.top, `side ${side}`).toBeGreaterThanOrEqual(80);
      expect(area.bottom, `side ${side}`).toBeLessThanOrEqual(120);
    }
  });
});

describe("a drawn line", () => {
  it("runs along its edge between the two dots, with its drawer's mark in the middle", () => {
    const flat = bounds(painted(draw((ctx) => drawLine(ctx, theme, 100, 100, 60, { side: 0, horizontal: true }))));
    expect(flat.left).toBeGreaterThanOrEqual(70);
    expect(flat.right).toBeLessThanOrEqual(130);
    expect(flat.right - flat.left).toBeGreaterThan(48);
    expect(flat.bottom - flat.top).toBeLessThan(strokeOf(60) * 3);
    const upright = bounds(painted(draw((ctx) => drawLine(ctx, theme, 100, 100, 60, { side: 1, horizontal: false }))));
    expect(upright.top).toBeGreaterThanOrEqual(70);
    expect(upright.bottom).toBeLessThanOrEqual(130);
    expect(upright.right - upright.left).toBeLessThan(strokeOf(60) * 3);
    expect(count(draw((ctx) => drawLine(ctx, theme, 100, 100, 60, { side: 1 })), "arc")).toBeGreaterThan(0);
  });

  it("keeps the approved thickness for its length on a small board too, and never thinner than can be seen", () => {
    expect(strokeOf(60)).toBeCloseTo(60 * 0.095, 6);
    expect(strokeOf(30)).toBeLessThanOrEqual(30 * 0.1);
    expect(strokeOf(10)).toBeGreaterThanOrEqual(2.5);
  });

  it("grows from its middle while it is being drawn, its mark coming last", () => {
    const line = (progress) => draw((ctx) => drawLine(ctx, theme, 100, 100, 60, { side: 1, progress }));
    expect(widthOf(line(0.5))).toBeLessThan(widthOf(line(1)));
    expect(count(line(0), "arc")).toBe(0);
    expect(line(0.5).depth).toBe(0);
  });

  it("is a plain ink line with no mark when nobody knows who drew it", () => {
    const plain = draw((ctx) => drawLine(ctx, theme, 100, 100, 60, { side: null }));
    expect(plain.calls.filter((call) => call.op === "stroke")).toHaveLength(1);
    expect(plain.calls.filter((call) => call.op === "set" && call.name === "strokeStyle").map((call) => call.value)).toEqual([theme.ink]);
  });

  it("shows faded while its move waits for the other phone", () => {
    const faded = draw((ctx) => drawLine(ctx, theme, 100, 100, 60, { side: 0, alpha: 0.55 }));
    expect(faded.calls.filter((call) => call.op === "set" && call.name === "globalAlpha").map((call) => call.value)).toContain(0.55);
  });
});

describe("a claimed box", () => {
  it("fills its cell with its owner's mark, inside the cell", () => {
    for (const side of [0, 1]) {
      const ctx = draw((pen) => drawClaimedBox(pen, theme, 100, 100, 50, side));
      const area = bounds(painted(ctx));
      expect(area.left, `side ${side}`).toBeGreaterThanOrEqual(75);
      expect(area.right, `side ${side}`).toBeLessThanOrEqual(125);
      expect(area.top, `side ${side}`).toBeGreaterThanOrEqual(75);
      expect(area.bottom, `side ${side}`).toBeLessThanOrEqual(125);
      expect(ctx.depth).toBe(0);
    }
    expect(count(draw((ctx) => drawClaimedBox(ctx, theme, 100, 100, 50, 0)), "arc")).toBe(0);
    expect(count(draw((ctx) => drawClaimedBox(ctx, theme, 100, 100, 50, 1)), "arc")).toBeGreaterThan(0);
  });

  it("pops up from smaller to its full size", () => {
    const box = (pop) => draw((ctx) => drawClaimedBox(ctx, theme, 100, 100, 50, 0, { pop }));
    expect(widthOf(box(0))).toBeLessThan(widthOf(box(0.5)));
    expect(widthOf(box(0.5))).toBeLessThan(widthOf(box(1)));
  });
});

describe("the mark of a side beside a player's name", () => {
  it("is a small drawing of that side's mark, a cross or a ring, hidden from screen readers", () => {
    const [cross, ring] = [sideMark(0), sideMark(1)];
    expect(cross).not.toBe(ring);
    for (const mark of [cross, ring]) {
      expect(mark).toMatch(/^<svg [^>]*aria-hidden="true"/);
      expect(mark).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
    }
    expect(cross).toContain("<path");
    expect(cross).not.toContain("<circle");
    expect(ring).toContain("<circle");
    expect(ring).not.toContain("<path");
  });
});
