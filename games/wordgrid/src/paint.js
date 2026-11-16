import { drawBoardFrame, drawPieceShadow } from "../../../kit/src/tabletop/frame.js";
import { cellCentre } from "../../../kit/src/tabletop/grid.js";
import { layoutFor } from "./layout.js";
import { drawLastWord, drawPendingClock, drawTrace, drawWordBurst } from "./marks.js";
import { CELLS } from "./rules.js";
import { drawTile } from "./tiles.js";

export const TILE = 0.9;

const pointsOf = (grid, cells) => cells.map((cell) => {
  const { x, y } = cellCentre(grid, cell);
  return [x, y];
});

function tileState(view, cell) {
  const hop = view.hops.find((one) => one.cell === cell)?.progress ?? 0;
  const shake = view.shake?.cells.includes(cell) ? view.shake.progress : 0;
  return { hop, shake, can: view.can.includes(cell), last: view.last.includes(cell) };
}

function drawCell(ctx, theme, grid, view, cell, extra = {}) {
  const { x, y } = cellCentre(grid, cell);
  const size = grid.cell * TILE;
  const state = { ...tileState(view, cell), ...extra };
  if (state.hop > 0) drawPieceShadow(ctx, x, y, size * 0.42, { colour: theme.ink, lift: Math.sin(state.hop * Math.PI) * size * 0.2, strength: 0.22 });
  drawTile(ctx, theme, x, y, size, view.grid?.[cell] ?? "", state);
}

export function drawBoard(ctx, theme, view) {
  const { frame, grid } = layoutFor(view.size, view.phase);
  const traced = view.trace?.path ?? [];
  drawBoardFrame(ctx, frame, { wood: theme.board.frame, ink: theme.ink, rim: theme.rim });
  drawLastWord(ctx, theme, pointsOf(grid, view.last), grid.cell);
  for (let cell = 0; cell < CELLS; cell += 1) if (!traced.includes(cell)) drawCell(ctx, theme, grid, view, cell);
  if (view.trace) {
    drawTrace(ctx, theme, pointsOf(grid, traced), view.trace.side, grid.cell);
    traced.forEach((cell, at) => drawCell(ctx, theme, grid, view, cell, { side: view.trace.side, order: at + 1, can: false, last: false }));
  }
  if (view.burst) {
    const { x, y } = cellCentre(grid, view.burst.cell);
    drawWordBurst(ctx, theme, x, y, grid.cell, view.burst.progress, view.burst.side);
  }
  if (view.pending !== null && view.pending !== undefined) {
    const { x, y } = cellCentre(grid, view.pending);
    drawPendingClock(ctx, theme, x, y, grid.cell * TILE);
  }
}
