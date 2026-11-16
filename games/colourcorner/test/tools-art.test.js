import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { GLYPHS, TOOL_ICONS, drawMarker, drawPot, drawTool } from "../src/tools-art.js";
import { THEME } from "../src/theme.js";

const area = { x: 40, y: 40, w: 88, h: 88 };
const inside = (ctx, slack = 2) => {
  const box = bounds(painted(ctx));
  return box.left >= area.x - slack && box.top >= area.y - slack && box.right <= area.x + area.w + slack && box.bottom <= area.y + area.h + slack;
};

describe("a paint pot", () => {
  it("shows its paint inside its square, and grows with a ring in the app's accent when chosen", () => {
    const idle = draw((ctx) => drawPot(ctx, area, THEME, { colour: 7 }));
    const chosen = draw((ctx) => drawPot(ctx, area, THEME, { colour: 7, chosen: true }));
    expect(colours(idle)).toContain(THEME.art.paints[7]);
    expect(inside(idle)).toBe(true);
    expect(inside(chosen)).toBe(true);
    expect(colours(chosen)).toContain(THEME.ui.accent);
    expect(colours(idle)).not.toContain(THEME.ui.accent);
    const radius = (ctx) => Math.max(...ctx.calls.filter((call) => call.op === "ellipse").map((call) => call.rx));
    expect(radius(chosen)).toBeGreaterThan(radius(idle));
  });

  it("shows a pattern in the chosen colour on a pattern pot", () => {
    const plain = shapes(draw((ctx) => drawPot(ctx, area, THEME, { colour: 2 }))).length;
    for (const pattern of ["dots", "stripes", "stars", "rainbow", "glitter"]) {
      const ctx = draw((pen) => drawPot(pen, area, THEME, { colour: 2, pattern }));
      expect(shapes(ctx).length, pattern).toBeGreaterThan(plain + 4);
      expect(ctx.calls.some((call) => call.op === "clip"), pattern).toBe(true);
    }
  });
});

describe("a tool button", () => {
  it("draws every tool's own picture on a card of the app's colours, inside its square", () => {
    for (const tool of TOOL_ICONS) {
      const ctx = draw((pen) => drawTool(pen, tool, area, THEME, { colour: 3 }));
      expect(inside(ctx), tool).toBe(true);
      expect(colours(ctx), tool).toContain(THEME.ui.surface);
      expect(shapes(ctx).length, tool).toBeGreaterThan(4);
    }
  });

  it("tells each tool apart by its drawing", () => {
    const seen = TOOL_ICONS.map((tool) => shapes(draw((pen) => drawTool(pen, tool, area, THEME, { colour: 3 }))).join("|"));
    expect(new Set(seen).size).toBe(TOOL_ICONS.length);
  });

  it("marks the chosen tool with the accent", () => {
    expect(colours(draw((pen) => drawTool(pen, "brush", area, THEME, { colour: 3, chosen: true })))).toContain(THEME.ui.accent);
  });
});

describe("the brush markers", () => {
  it("differ in shape, not only in colour: a round nib for the player, a chisel for the other", () => {
    const mine = shapes(draw((ctx) => drawMarker(ctx, 100, 100, 50, false, THEME)));
    const theirs = shapes(draw((ctx) => drawMarker(ctx, 100, 100, 50, true, THEME)));
    expect(mine.join()).not.toBe(theirs.join());
    expect(mine.some((one) => one.startsWith('["ellipse"'))).toBe(true);
    expect(theirs.filter((one) => one.startsWith('["lineTo"')).length).toBeGreaterThanOrEqual(3);
  });
});

describe("the bar's own glyphs", () => {
  it("draw a way back, undo, the previous and next screen of tiles and sending", () => {
    for (const name of ["back", "undo", "prev", "next", "send", "edit"]) {
      const ctx = draw((pen) => GLYPHS[name](pen, 24, THEME.ui.text, 2));
      expect(ctx.calls.filter((call) => call.op === "stroke" || call.op === "fill").length, name).toBeGreaterThan(0);
      const box = bounds(painted(ctx));
      expect(Math.max(-box.left, box.right, -box.top, box.bottom), name).toBeLessThanOrEqual(14);
    }
  });
});
