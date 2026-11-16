import { describe, expect, it } from "vitest";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { TABLES } from "../src/levels.js";
import { drawTable, drawTableIcon } from "../src/tables.js";
import { THEME } from "../src/theme.js";

describe("the tables", () => {
  it("draws each table inside its frame, whatever its size, the frame a few pixels around it", () => {
    for (const look of TABLES) {
      for (const [w, h] of [[200, 300], [360, 540], [640, 960]]) {
        const ctx = draw((pen) => drawTable(pen, { x: 20, y: 40, w, h }, look, THEME, 1.5));
        const area = bounds(painted(ctx));
        expect(area.left, `${look} ${w}`).toBeGreaterThanOrEqual(20 - 8);
        expect(area.top, `${look} ${w}`).toBeGreaterThanOrEqual(40 - 8);
        expect(area.right, `${look} ${w}`).toBeLessThanOrEqual(20 + w + 8);
        expect(area.bottom, `${look} ${w}`).toBeLessThanOrEqual(40 + h + 8);
        expect(ctx.depth).toBe(0);
      }
    }
  });

  it("marks both goal lines and the middle of the table with dashes", () => {
    const ctx = draw((pen) => drawTable(pen, { x: 0, y: 0, w: 300, h: 450 }, "pond", THEME, 0));
    expect(ctx.calls.filter((call) => call.op === "setLineDash" && call.segments.length).length).toBeGreaterThanOrEqual(1);
    const dashed = ctx.calls.filter((call) => call.op === "lineTo").map((call) => Math.round(call.points[0][1]));
    expect(dashed).toEqual(expect.arrayContaining([225]));
  });

  it("draws a small table for the looks screen inside the box it is given", () => {
    for (const look of TABLES) {
      const area = bounds(painted(draw((pen) => drawTableIcon(pen, look, { x: 10, y: 10, w: 100, h: 100 }, THEME, 0))));
      expect(area.left).toBeGreaterThanOrEqual(10);
      expect(area.right).toBeLessThanOrEqual(110);
      expect(area.top).toBeGreaterThanOrEqual(10);
      expect(area.bottom).toBeLessThanOrEqual(110);
    }
  });
});
