import { describe, expect, it } from "vitest";
import { pieceOf } from "../src/pieces.js";
import { EMPTY, emptyCourt, fits, fitsAnywhere, fullest, fullLines, place, rescue, spots } from "../src/court.js";

function courtFrom(rows) {
  const court = emptyCourt(rows.length);
  rows.forEach((row, y) => [...row].forEach((mark, x) => mark !== "." && (court.cells[y * rows.length + x] = Number(mark))));
  return court;
}

const picture = (court) => Array.from({ length: court.size }, (_, y) => court.cells.slice(y * court.size, (y + 1) * court.size).map((cell) => (cell === EMPTY ? "." : cell)).join(""));

describe("the court", () => {
  it("starts empty, eight by eight unless asked", () => {
    expect(emptyCourt().cells).toEqual(Array(64).fill(EMPTY));
    expect(emptyCourt(6).size).toBe(6);
    expect(emptyCourt(9).cells).toHaveLength(81);
  });

  it("takes a piece only inside its edges and on free cells", () => {
    const court = courtFrom(["........", ".1......", "........", "........", "........", "........", "........", "........"]);
    const square = pieceOf("square");
    expect(fits(court, square, 0)).toBe(false);
    expect(fits(court, square, 2)).toBe(true);
    expect(fits(court, square, 6)).toBe(true);
    expect(fits(court, square, 7)).toBe(false);
    expect(fits(court, square, 62)).toBe(false);
    expect(fits(court, square, 54)).toBe(true);
    expect(fits(court, square, -1)).toBe(false);
    expect(fits(court, square, 1.5)).toBe(false);
    expect(spots(court, pieceOf("four-h"))).not.toContain(8);
    expect(spots(court, pieceOf("four-h"))).toContain(10);
    expect(spots(court, pieceOf("four-h"))).not.toContain(13);
  });

  it("puts the piece's family on its cells and keeps the old court as it was", () => {
    const court = emptyCourt();
    const placed = place(court, pieceOf("tee-up"), 9);
    expect(picture(placed.court).slice(0, 3)).toEqual(["........", ".222....", "..2....."]);
    expect(placed.tiles).toEqual([9, 10, 11, 18]);
    expect(placed.lines).toEqual([]);
    expect(court.cells.every((cell) => cell === EMPTY)).toBe(true);
    expect(place(placed.court, pieceOf("single"), 10)).toBeNull();
  });

  it("clears a full row and a full column at once, sharing their crossing cell", () => {
    const court = courtFrom(["...0....", "...0....", "...0....", "111.1111", "...0....", "...0....", "...0....", "...0...."]);
    const placed = place(court, pieceOf("single"), 27);
    expect(placed.lines.map(({ kind, index }) => [kind, index])).toEqual([["row", 3], ["column", 3]]);
    expect(placed.lines[0].cells.find(({ at }) => at === 27).family).toBe(0);
    expect(placed.lines[0].cells.find(({ at }) => at === 24).family).toBe(1);
    expect(placed.court.cells.every((cell) => cell === EMPTY)).toBe(true);
    expect(placed.emptied).toBe(true);
  });

  it("clears several rows together and says the court is not empty when tiles are left", () => {
    const court = courtFrom(["2222222.", "3333333.", "........", "........", "........", "........", "........", "1......."]);
    const placed = place(court, pieceOf("domino-v"), 7);
    expect(placed.lines.map(({ kind, index }) => `${kind}${index}`)).toEqual(["row0", "row1"]);
    expect(placed.emptied).toBe(false);
    expect(picture(placed.court)[7]).toBe("1.......");
  });

  it("clears a full three-by-three bed in a court with beds, and only there", () => {
    const rows = ["00.......", "000......", "000......", ".........", ".........", ".........", ".........", ".........", "........."];
    const bed = place(courtFrom(rows), pieceOf("single"), 2, { beds: true });
    expect(bed.lines.map(({ kind, index }) => [kind, index])).toEqual([["bed", 0]]);
    expect(bed.court.cells.every((cell) => cell === EMPTY)).toBe(true);
    expect(place(courtFrom(rows), pieceOf("single"), 2).lines).toEqual([]);
  });

  it("finds the full lines of a court", () => {
    const court = courtFrom(["111111", "......", "......", "......", "......", "......"]);
    expect(fullLines(court).map(({ kind, index }) => `${kind}${index}`)).toEqual(["row0"]);
  });

  it("knows whether any of some pieces still fits anywhere", () => {
    const full = courtFrom(["1111111.", "11111111", "11111111", "11111111", "11111111", "11111111", "11111111", "11111111"]);
    expect(fitsAnywhere(full, [pieceOf("square"), pieceOf("domino-h")])).toBe(false);
    expect(fitsAnywhere(full, [pieceOf("square"), pieceOf("single")])).toBe(true);
    expect(fitsAnywhere(full, [])).toBe(false);
  });

  it("names the fullest row or column, and lets it go by itself to make room", () => {
    const court = courtFrom(["1.1.1.", "......", "11111.", "......", "1.....", "1....."]);
    expect(fullest(court)).toMatchObject({ kind: "row", index: 2 });
    const freed = rescue(court);
    expect(freed.line).toMatchObject({ kind: "row", index: 2 });
    expect(freed.line.cells.map(({ at }) => at)).toEqual([12, 13, 14, 15, 16]);
    expect(picture(freed.court)[2]).toBe("......");
    expect(fullest(emptyCourt(6))).toBeNull();
  });
});
