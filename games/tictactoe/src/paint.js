import { boardFrame, drawBoardFrame } from "../../../kit/src/tabletop/frame.js";
import { cellCentre, gridIn } from "../../../kit/src/tabletop/grid.js";
import { paint, roundedRect } from "../../../kit/src/canvas/pen.js";
import { drawLastMove, drawLegalTarget, drawMiss, drawPendingClock, drawPlacementBurst, drawWinRibbon } from "./marks.js";
import { drawPiece } from "./pieces.js";

const SIDE = 3;
const CHEER = 0.09;
const PENDING_ALPHA = 0.55;
const layouts = new Map();

export function layoutFor(size) {
  if (!layouts.has(size)) {
    const frame = boardFrame(size, { radius: 0.075, line: 0.012 });
    const grid = gridIn(frame.inner, { columns: SIDE });
    const gap = frame.outer.w * 0.024;
    const cell = grid.cell - gap;
    layouts.set(size, { frame, grid, gap, cell, piece: cell * 0.76 });
  }
  return layouts.get(size);
}

export const cellCentreOf = (size, index) => cellCentre(layoutFor(size).grid, index);

function drawCell(ctx, theme, cell, x, y) {
  roundedRect(ctx, x - cell / 2, y - cell / 2, cell, cell, cell * 0.18);
  paint(ctx, theme.board.cell, theme.grid.line, Math.max(2, cell * 0.025));
}

function pieceLook(view, index, side, size) {
  const { placing, win } = view;
  const cheering = Boolean(win && win.winner === side && win.line.includes(index));
  return {
    side,
    grow: placing?.cell === index ? placing.grow : 1,
    alpha: view.pending && index === view.last ? PENDING_ALPHA : 1,
    lift: cheering ? win.cheer * CHEER * size : 0,
    tilt: cheering ? win.tilt : 0,
    face: win && win.winner !== null && win.winner !== side ? "surprised" : "calm",
  };
}

function drawSquare(ctx, theme, layout, view, index) {
  const { cell, piece } = layout;
  const centre = cellCentreOf(view.size, index);
  const missed = view.miss?.cell === index ? view.miss : null;
  const [x, y] = [centre.x + (missed ? missed.shake * cell : 0), centre.y];
  drawCell(ctx, theme, cell, x, y);
  const side = view.cells[index];
  if (side === null) {
    if (view.open.includes(index)) drawLegalTarget(ctx, theme, x, y, cell, { side: view.side });
  } else {
    drawPiece(ctx, theme, x, y, piece, pieceLook(view, index, side, piece));
    if (index === view.last && !view.win) drawLastMove(ctx, theme, x, y, cell);
    if (index === view.last && view.pending) drawPendingClock(ctx, theme, x, y, cell);
  }
  if (missed) drawMiss(ctx, theme, x, y, cell, missed.ring);
}

function drawRibbon(ctx, theme, layout, view) {
  const { line, winner, ribbon } = view.win;
  const [first, last] = [cellCentreOf(view.size, line[0]), cellCentreOf(view.size, line[2])];
  const length = Math.hypot(last.x - first.x, last.y - first.y) || 1;
  const reach = layout.cell * 0.3;
  const [ux, uy] = [((last.x - first.x) / length) * reach, ((last.y - first.y) / length) * reach];
  drawWinRibbon(ctx, theme, { x: first.x - ux, y: first.y - uy }, { x: last.x + ux, y: last.y + uy }, layout.frame.outer.w * 0.035, ribbon, winner);
}

export function drawBoard(ctx, theme, view) {
  const layout = layoutFor(view.size);
  drawBoardFrame(ctx, layout.frame, { wood: theme.board.frame, ink: theme.ink, rim: theme.rim });
  for (let index = 0; index < SIDE * SIDE; index += 1) drawSquare(ctx, theme, layout, view, index);
  const { placing } = view;
  if (placing?.burst !== null && placing?.burst !== undefined) {
    const { x, y } = cellCentreOf(view.size, placing.cell);
    drawPlacementBurst(ctx, theme, x, y, layout.cell, placing.burst, placing.side);
  }
  if (view.win?.line) drawRibbon(ctx, theme, layout, view);
}
