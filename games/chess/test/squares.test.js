import { describe, expect, it } from "vitest";
import { START } from "../src/rules.js";
import { cellOf, cellsOf, colourOf, kingCell, nameOf, typeOf } from "../src/squares.js";

describe("the squares of a chess position", () => {
  it("reads a position into 64 cells from a8 to h1, as a FEN lists them", () => {
    const cells = cellsOf(START);
    expect(cells).toHaveLength(64);
    expect(cells.slice(0, 8).join("")).toBe("rnbqkbnr");
    expect(cells.slice(56).join("")).toBe("RNBQKBNR");
    expect(cells.slice(16, 48).every((one) => one === null)).toBe(true);
    expect(cellsOf("8/8/8/3pP3/8/8/8/K6k w - d6 0 1").filter(Boolean)).toEqual(["p", "P", "K", "k"]);
  });

  it("names each cell and finds a cell by its name", () => {
    expect(nameOf(0)).toBe("a8");
    expect(nameOf(63)).toBe("h1");
    expect(nameOf(cellOf("e4"))).toBe("e4");
    expect(cellOf("e2")).toBe(52);
    expect(cellOf("z9")).toBeNull();
  });

  it("tells a piece's colour and kind, white being side 0", () => {
    expect([colourOf("K"), colourOf("q"), colourOf(null)]).toEqual([0, 1, null]);
    expect([typeOf("N"), typeOf("p")]).toEqual(["n", "p"]);
  });

  it("finds the king of a side", () => {
    expect(nameOf(kingCell(cellsOf(START), 0))).toBe("e1");
    expect(nameOf(kingCell(cellsOf(START), 1))).toBe("e8");
    expect(kingCell(cellsOf("8/8/8/8/8/8/8/8 w - - 0 1"), 0)).toBeNull();
  });
});
