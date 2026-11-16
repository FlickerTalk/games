import { describe, expect, it } from "vitest";
import { PIECES, familyOf, pieceOf, rotated } from "../src/pieces.js";

const shape = (piece) => {
  const rows = Array.from({ length: piece.height }, () => Array(piece.width).fill("."));
  for (const [x, y] of piece.cells) rows[y][x] = "#";
  return rows.map((row) => row.join(""));
};

describe("the pieces", () => {
  it("are twenty-six shapes of one to six tiles, each orientation its own piece", () => {
    expect(PIECES).toHaveLength(26);
    expect(new Set(PIECES.map((piece) => piece.id)).size).toBe(26);
    expect(new Set(PIECES.map((piece) => shape(piece).join("/"))).size).toBe(26);
    for (const piece of PIECES) {
      expect(piece.cells.length).toBeGreaterThanOrEqual(1);
      expect(piece.cells.length).toBeLessThanOrEqual(6);
      expect(Math.max(...piece.cells.map(([x]) => x)) + 1).toBe(piece.width);
      expect(Math.max(...piece.cells.map(([, y]) => y)) + 1).toBe(piece.height);
    }
  });

  it("have no tall well's shapes: none of the skew four-tile shapes", () => {
    const shapes = PIECES.map((piece) => shape(piece).join("/"));
    for (const skew of ["##./.##", ".##/##.", "#./##/.#", ".#/##/#."]) expect(shapes).not.toContain(skew);
  });

  it("take their family from their size: one or two tiles, three, four, five or six", () => {
    expect([1, 2, 3, 4, 5, 6].map(familyOf)).toEqual([0, 0, 1, 2, 3, 3]);
    for (const piece of PIECES) expect(piece.family).toBe(familyOf(piece.cells.length));
  });

  it("are found by their id, and nothing else is", () => {
    expect(shape(pieceOf("corner-nw"))).toEqual(["##", "#."]);
    expect(shape(pieceOf("you-h"))).toEqual(["#.#", "###"]);
    expect(pieceOf("nothing")).toBeNull();
    expect(pieceOf(undefined)).toBeNull();
  });

  it("turn a quarter clockwise each step, back to themselves after four", () => {
    const ell = pieceOf("ell-up");
    expect(shape(rotated(ell, 1))).toEqual(shape(pieceOf("ell-right")));
    expect(shape(rotated(ell, 2))).toEqual(shape(pieceOf("ell-down")));
    expect(shape(rotated(ell, 3))).toEqual(shape(pieceOf("ell-left")));
    expect(shape(rotated(ell, 4))).toEqual(shape(ell));
    expect(shape(rotated(pieceOf("pee-h"), 1))).toEqual(["###", ".##"]);
    expect(rotated(pieceOf("pee-h"), 1).family).toBe(3);
  });

  it("are frozen", () => {
    expect(Object.isFrozen(PIECES) && Object.isFrozen(PIECES[0]) && Object.isFrozen(PIECES[0].cells)).toBe(true);
  });
});
