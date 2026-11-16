import { describe, expect, it } from "vitest";
import { cellAt, cellBox, cellCentre, fractionOf, gridIn } from "../../src/tabletop/grid.js";

describe("a board's grid", () => {
  it("fills a square box with square cells", () => {
    const grid = gridIn({ x: 10, y: 20, w: 320, h: 320 }, { columns: 8 });
    expect(grid).toMatchObject({ x: 10, y: 20, w: 320, h: 320, cell: 40, columns: 8, rows: 8 });
  });

  it("centres a board that is not square in its box, its cells still square", () => {
    const grid = gridIn({ x: 0, y: 0, w: 350, h: 350 }, { columns: 7, rows: 6 });
    expect(grid.cell).toBe(50);
    expect(grid).toMatchObject({ x: 0, y: 25, w: 350, h: 300 });
  });

  it("places a cell by its index, row after row, and turned for the side that sits at the top", () => {
    const grid = gridIn({ x: 0, y: 0, w: 80, h: 80 }, { columns: 8 });
    expect(cellBox(grid, 0)).toEqual({ x: 0, y: 0, w: 10, h: 10 });
    expect(cellBox(grid, 9)).toEqual({ x: 10, y: 10, w: 10, h: 10 });
    expect(cellBox(grid, 0, { flipped: true })).toEqual({ x: 70, y: 70, w: 10, h: 10 });
    expect(cellCentre(grid, 63)).toEqual({ x: 75, y: 75 });
    expect(cellCentre(grid, 63, { flipped: true })).toEqual({ x: 5, y: 5 });
  });

  it("finds the cell under a point, and nothing off the board", () => {
    const grid = gridIn({ x: 4, y: 4, w: 80, h: 80 }, { columns: 8 });
    expect(cellAt(grid, 5, 5)).toBe(0);
    expect(cellAt(grid, 83, 83)).toBe(63);
    expect(cellAt(grid, 83, 83, { flipped: true })).toBe(0);
    expect(cellAt(grid, 2, 40)).toBeNull();
    expect(cellAt(grid, 40, 85)).toBeNull();
  });

  it("gives a box as shares of the canvas, so buttons laid over it follow any size", () => {
    expect(fractionOf({ x: 40, y: 80, w: 40, h: 40 }, 400)).toEqual({ x: 0.1, y: 0.2, w: 0.1, h: 0.1 });
  });
});
