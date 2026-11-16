import { describe, expect, it } from "vitest";
import { EMPTY, emptyCourt } from "../src/court.js";
import { cancelDrag, dropDrag, idleDrag, liftPiece, moveDrag } from "../src/drag.js";

const court = { x: 20, y: 100, cell: 40, size: 8 };
const field = (cells = emptyCourt().cells) => ({ court, cells, lift: 60, beds: false });
const over = (column, row, piece = { width: 2, height: 2 }) => ({
  x: court.x + (column + piece.width / 2) * court.cell,
  y: court.y + (row + piece.height / 2) * court.cell + 60,
});

describe("dragging a piece", () => {
  it("starts idle and lifts a piece from its slot under the finger", () => {
    expect(idleDrag()).toEqual({ phase: "idle" });
    const drag = liftPiece(1, "square", { x: 200, y: 600 });
    expect(drag).toMatchObject({ phase: "lifted", slot: 1, piece: "square", point: { x: 200, y: 600 }, target: null });
  });

  it("aims the piece floating above the finger at the cells under it", () => {
    const drag = moveDrag(liftPiece(0, "square", { x: 200, y: 600 }), over(3, 2), field());
    expect(drag.target).toMatchObject({ at: 2 * 8 + 3, cells: [19, 20, 27, 28], lines: [] });
  });

  it("snaps to the nearest place where the piece fits when the cell under it is taken", () => {
    const cells = [...emptyCourt().cells];
    cells[19] = 1;
    const drag = moveDrag(liftPiece(0, "square", { x: 0, y: 0 }), over(3, 2), field(cells));
    expect(drag.target).not.toBeNull();
    expect(drag.target.cells).not.toContain(19);
    const [column, row] = [drag.target.at % 8, Math.floor(drag.target.at / 8)];
    expect(Math.abs(column - 3) <= 1 && Math.abs(row - 2) <= 1).toBe(true);
  });

  it("keeps the piece inside the court near its edges", () => {
    const drag = moveDrag(liftPiece(0, "square", { x: 0, y: 0 }), over(7.3, 7.2), field());
    expect(drag.target.at).toBe(6 * 8 + 6);
  });

  it("aims at nothing when the piece is held away from the court", () => {
    expect(moveDrag(liftPiece(0, "square", { x: 0, y: 0 }), { x: 200, y: 700 }, field()).target).toBeNull();
    expect(moveDrag(liftPiece(0, "square", { x: 0, y: 0 }), { x: 200, y: 20 }, field()).target).toBeNull();
  });

  it("names the rows and columns the piece would fill", () => {
    const cells = [...emptyCourt().cells];
    for (let x = 0; x < 8; x += 1) if (x !== 3 && x !== 4) cells[5 * 8 + x] = 2;
    const drag = moveDrag(liftPiece(0, "square", { x: 0, y: 0 }), over(3, 4), field(cells));
    expect(drag.target.lines.map(({ kind, index }) => `${kind}${index}`)).toEqual(["row5"]);
  });

  it("lays the piece where it aims when let go, and sends it back to its slot otherwise", () => {
    const aimed = moveDrag(liftPiece(2, "square", { x: 0, y: 0 }), over(0, 0), field());
    expect(dropDrag(aimed)).toEqual({ drag: idleDrag(), place: { slot: 2, at: 0 } });
    const away = moveDrag(liftPiece(2, "square", { x: 0, y: 0 }), { x: 200, y: 700 }, field());
    expect(dropDrag(away)).toEqual({ drag: idleDrag(), back: { slot: 2, piece: "square", point: { x: 200, y: 700 } } });
    expect(cancelDrag(aimed)).toEqual({ drag: idleDrag(), back: { slot: 2, piece: "square", point: aimed.point } });
  });

  it("does nothing while nothing is lifted", () => {
    expect(moveDrag(idleDrag(), { x: 0, y: 0 }, field())).toEqual(idleDrag());
    expect(dropDrag(idleDrag())).toEqual({ drag: idleDrag() });
    expect(cancelDrag(idleDrag())).toEqual({ drag: idleDrag() });
  });

  it("works on the small and the big courts", () => {
    const small = { x: 0, y: 0, cell: 50, size: 6 };
    const drag = moveDrag(liftPiece(0, "single", { x: 0, y: 0 }), { x: 5.5 * 50, y: 5.5 * 50 + 60 }, { court: small, cells: Array(36).fill(EMPTY), lift: 60, beds: false });
    expect(drag.target.at).toBe(35);
  });
});
