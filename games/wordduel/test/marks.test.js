import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawBadge, drawPendingClock, drawTurnOutline, sideMark } from "../src/marks.js";
import { themeFor } from "../src/theme.js";

const theme = themeFor(null, { dark: false });
const runs = (ctx) => {
  const found = [];
  let run = 0;
  for (const call of ctx.calls) {
    if (call.op === "moveTo") run = 1;
    else if (call.op === "lineTo" && run) run += 1;
    else if (call.op === "closePath" || call.op === "stroke") {
      if (run) found.push(run);
      run = 0;
    }
  }
  return found;
};
const arcs = (ctx) => ctx.calls.filter((call) => call.op === "arc").length;

describe("a side's badge over its grid", () => {
  it("is a square with a star for the first side and a disc with two bars for the second, apart by shape as well as colour", () => {
    const [first, second] = [0, 1].map((side) => draw((ctx) => drawBadge(ctx, theme, 50, 50, 24, side)));
    expect(runs(first)).toContain(10);
    expect(arcs(first)).toBe(0);
    expect(runs(second)).not.toContain(10);
    expect(arcs(second)).toBe(1);
    expect(runs(second).filter((one) => one === 2)).toHaveLength(2);
    expect(colours(first)).toContain(theme.sides[0].body);
    expect(colours(second)).toContain(theme.sides[1].body);
  });

  it("wears a ring in its side's colour while that side is to play, and stays round its centre", () => {
    for (const side of [0, 1]) {
      const [idle, active] = [false, true].map((on) => draw((ctx) => drawBadge(ctx, theme, 50, 50, 24, side, { active: on })));
      expect(arcs(active), `side ${side}`).toBe(arcs(idle) + 1);
      const area = bounds(painted(active));
      expect(area.left).toBeGreaterThanOrEqual(50 - 24 * 0.7);
      expect(area.right).toBeLessThanOrEqual(50 + 24 * 0.7);
      expect(area.top).toBeGreaterThanOrEqual(50 - 24 * 0.7);
      expect(area.bottom).toBeLessThanOrEqual(50 + 24 * 0.7);
    }
  });
});

describe("the turn and a guess on its way", () => {
  it("outlines the grid of the side to play in that side's colour, just outside it", () => {
    const box = { x: 20, y: 30, w: 100, h: 120 };
    const ctx = draw((pen) => drawTurnOutline(pen, theme, box, 1));
    expect(colours(ctx)).toContain(theme.sides[1].deep);
    const area = bounds(painted(ctx));
    expect(area.left).toBeLessThan(box.x);
    expect(area.right).toBeGreaterThan(box.x + box.w);
    expect(area.left).toBeGreaterThanOrEqual(box.x - 8);
    expect(area.bottom).toBeLessThanOrEqual(box.y + box.h + 8);
  });

  it("shows a small clock beside a guess still on its way", () => {
    const ctx = draw((pen) => drawPendingClock(pen, theme, 100, 100, 20));
    expect(arcs(ctx)).toBe(1);
    expect(runs(ctx)).toContain(3);
    const area = bounds(painted(ctx));
    expect(area.right - area.left).toBeLessThanOrEqual(22);
  });
});

describe("the mark of a side beside a player's name", () => {
  it("is a small drawing of that side's badge, hidden from screen readers", () => {
    const [first, second] = [sideMark(0), sideMark(1)];
    expect(first).not.toBe(second);
    for (const mark of [first, second]) {
      expect(mark).toMatch(/^<svg [^>]*aria-hidden="true"/);
      expect(mark).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
    }
    expect(first).toContain("<polygon");
    expect(first).toContain(theme.sides[0].body);
    expect(second).toContain("<circle");
    expect(second).not.toContain("<polygon");
    expect(second).toContain(theme.sides[1].body);
  });
});
