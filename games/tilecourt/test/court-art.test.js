import { describe, expect, it } from "vitest";
import { bounds, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { EMPTY } from "../src/court.js";
import { drawCourt, drawGlow, drawOutline } from "../src/court-art.js";
import { THEME } from "../src/theme.js";

const where = { x: 20, y: 40, cell: 30, size: 8 };
const empty = Array(64).fill(EMPTY);

describe("the court's art", () => {
  it("draws its stone sockets and frame around the cells, a little outside them", () => {
    const box = bounds(painted(draw((ctx) => drawCourt(ctx, where, empty, THEME))));
    expect(box).toEqual({ left: 15, top: 35, right: 20 + 240 + 5, bottom: 40 + 240 + 5 });
  });

  it("lays a tile on every taken cell and nothing on the free ones", () => {
    const cells = [...empty];
    cells[0] = 1;
    cells[63] = 3;
    const plain = shapes(draw((ctx) => drawCourt(ctx, where, empty, THEME))).length;
    const taken = shapes(draw((ctx) => drawCourt(ctx, where, cells, THEME))).length;
    expect(taken).toBeGreaterThan(plain);
    const one = [...empty];
    one[0] = 1;
    const single = shapes(draw((ctx) => drawCourt(ctx, where, one, THEME))).length;
    expect(taken - plain).toBeGreaterThan(single - plain);
  });

  it("marks the three-by-three beds of a big court, and none on an ordinary one", () => {
    const big = { x: 0, y: 0, cell: 20, size: 9 };
    const plain = shapes(draw((ctx) => drawCourt(ctx, big, Array(81).fill(EMPTY), THEME))).length;
    const beds = shapes(draw((ctx) => drawCourt(ctx, big, Array(81).fill(EMPTY), THEME, { beds: true }))).length;
    expect(beds).toBeGreaterThan(plain);
  });

  it("outlines where a piece would land, cell by cell, inside those cells", () => {
    const ctx = draw((pen) => drawOutline(pen, where, [0, 1, 9], true, THEME, 0));
    expect(ctx.calls.filter((call) => call.op === "stroke")).toHaveLength(3);
    const box = bounds(painted(ctx));
    expect(box.left).toBeGreaterThanOrEqual(20);
    expect(box.right).toBeLessThanOrEqual(20 + 60);
    expect(box.bottom).toBeLessThanOrEqual(40 + 60);
  });

  it("lights the rows, columns and beds that would leave, over exactly those cells", () => {
    const ctx = draw((pen) => drawGlow(pen, where, [{ kind: "row", index: 2 }, { kind: "column", index: 7 }], THEME, 0));
    const rects = ctx.calls.filter((call) => call.op === "fillRect").map((call) => call.points);
    expect(rects).toEqual([[[20, 100], [260, 130]], [[230, 40], [260, 280]]]);
    const bed = draw((pen) => drawGlow(pen, { x: 0, y: 0, cell: 10, size: 9 }, [{ kind: "bed", index: 4 }], THEME, 0));
    expect(bed.calls.find((call) => call.op === "fillRect").points).toEqual([[30, 30], [60, 60]]);
  });
});
