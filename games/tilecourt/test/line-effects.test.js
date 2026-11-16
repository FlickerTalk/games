import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted, shapes } from "../../../kit/test/avatars/recorder.js";
import { LINE_EFFECTS, drawLayeredClear, drawLineClear, drawLineEffect } from "../src/line-effects.js";
import { THEME } from "../src/theme.js";

const where = { x: 0, y: 0, cell: 40, size: 8 };
const line = (kind, index) => ({ kind, index, cells: Array.from({ length: 8 }, (_, at) => ({ at: kind === "row" ? index * 8 + at : at * 8 + index, family: at % 4 })) });
const themed = new Set(JSON.stringify(THEME).match(/#[0-9A-F]{6}|rgba\([^)]*\)/g));

describe("the line effects", () => {
  it("are six, each its own drawing", () => {
    expect(LINE_EFFECTS).toEqual(["lanterns", "birds", "leaves", "bubbles", "water", "sparks"]);
    const drawn = LINE_EFFECTS.map((effect) => shapes(draw((ctx) => drawLineEffect(ctx, effect, 100, 100, 40, 0.4, THEME))).join("\n"));
    expect(new Set(drawn).size).toBe(6);
  });

  it("draw each one around its point, about its size, in the theme's colours", () => {
    for (const effect of LINE_EFFECTS) {
      const ctx = draw((pen) => drawLineEffect(pen, effect, 100, 100, 40, 0.5, THEME));
      const box = bounds(painted(ctx));
      expect(box.left, effect).toBeGreaterThan(70);
      expect(box.right, effect).toBeLessThan(130);
      expect(box.top, effect).toBeGreaterThan(70);
      expect(box.bottom, effect).toBeLessThan(130);
      for (const colour of colours(ctx)) expect(themed.has(colour), `${effect} ${colour}`).toBe(true);
      expect(ctx.depth).toBe(0);
    }
  });

  it("run a light along the line first, lift its tiles into the effect, then leave the cells clear", () => {
    const first = draw((ctx) => drawLineClear(ctx, where, line("row", 3), "lanterns", 0.1, THEME));
    expect(first.calls.some((call) => call.op === "fillRect")).toBe(true);
    const middle = draw((ctx) => drawLineClear(ctx, where, line("row", 3), "lanterns", 0.5, THEME));
    expect(painted(middle).length).toBeGreaterThan(painted(first).length);
    expect(painted(draw((ctx) => drawLineClear(ctx, where, line("row", 3), "lanterns", 1, THEME)))).toEqual([]);
  });

  it("follow the line's direction, a row across and a column down", () => {
    const row = bounds(painted(draw((ctx) => drawLineClear(ctx, where, line("row", 3), "birds", 0.3, THEME))));
    const column = bounds(painted(draw((ctx) => drawLineClear(ctx, where, line("column", 3), "birds", 0.3, THEME))));
    expect(row.right - row.left).toBeGreaterThan(row.bottom - row.top);
    expect(column.bottom - column.top).toBeGreaterThan(column.right - column.left);
  });

  it("layer several lines one a little after the other", () => {
    const lines = [line("row", 1), line("column", 5)];
    const early = draw((ctx) => drawLayeredClear(ctx, where, lines, "leaves", 0.04, THEME));
    const onlyFirst = draw((ctx) => drawLineClear(ctx, where, lines[0], "leaves", 0.04, THEME));
    expect(painted(early).length).toBeGreaterThan(0);
    expect(shapes(early).slice(0, shapes(onlyFirst).length)).toEqual(shapes(onlyFirst));
    expect(painted(draw((ctx) => drawLayeredClear(ctx, where, lines, "leaves", 1, THEME)))).toEqual([]);
  });
});
