import { boardFrame, drawBoardFrame } from "../../../kit/src/tabletop/frame.js";
import { cellBox, cellCentre, gridIn } from "../../../kit/src/tabletop/grid.js";
import { paint, roundedRect } from "../../../kit/src/canvas/pen.js";
import { drawFlipSpark, drawLastMarker, drawLegalRing, drawPassBadge, drawPendingClock } from "./marks.js";
import { drawDisc } from "./pieces.js";

const SIDE = 8;
const DESIGN = 320;
const PENDING_ALPHA = 0.55;
const layouts = new Map();

export function layoutFor(size) {
  if (!layouts.has(size)) {
    const frame = boardFrame(size, { padding: 0.012, least: 2, radius: 0.045 });
    const grid = gridIn(frame.inner, { columns: SIDE });
    layouts.set(size, { frame, grid, radius: grid.cell * 0.39 });
  }
  return layouts.get(size);
}

function drawCloth(ctx, theme, { frame, grid }) {
  const { light, dark, stitch } = theme.board;
  const gap = Math.max(1, grid.cell * 0.045);
  for (let cell = 0; cell < SIDE * SIDE; cell += 1) {
    const box = cellBox(grid, cell);
    roundedRect(ctx, box.x + gap, box.y + gap, box.w - gap * 2, box.h - gap * 2, grid.cell * 0.12);
    paint(ctx, (Math.floor(cell / SIDE) + cell) % 2 ? dark : light);
  }
  const { outer } = frame;
  const unit = outer.w / DESIGN;
  ctx.save();
  ctx.setLineDash([5 * unit, 6 * unit]);
  roundedRect(ctx, outer.x + 5 * unit, outer.y + 5 * unit, outer.w - 10 * unit, outer.h - 10 * unit, 14 * unit);
  paint(ctx, null, stitch, Math.max(1, 1.5 * unit));
  ctx.restore();
}

function drawDiscs(ctx, theme, { grid, radius }, view) {
  const at = (cell) => cellCentre(grid, cell);
  view.cells.forEach((side, cell) => {
    if (side === null) return;
    const { x, y } = at(cell);
    const pop = cell === view.placed?.cell ? view.placed.pop : 1;
    drawDisc(ctx, theme, x, y, radius, { side, flip: view.flips?.[cell] ?? 1, pop, alpha: cell === view.pending ? PENDING_ALPHA : 1 });
  });
  for (const { cell, progress } of view.sparks ?? []) drawFlipSpark(ctx, theme, at(cell).x, at(cell).y, radius, progress);
}

function drawAbove(ctx, theme, { grid, radius }, view) {
  const at = (cell) => cellCentre(grid, cell);
  if (view.last !== null && view.last !== undefined && view.cells[view.last] !== null) drawLastMarker(ctx, theme, at(view.last).x, at(view.last).y, radius);
  if (view.pending !== null && view.pending !== undefined) drawPendingClock(ctx, theme, at(view.pending).x, at(view.pending).y, grid.cell);
  if (view.pass) {
    const { side, progress } = view.pass;
    const alpha = Math.min(1, progress / 0.1, (1 - progress) / 0.15);
    drawPassBadge(ctx, theme, grid.x + grid.w / 2, grid.y + grid.h / 2, grid.w * 0.62, side, { time: view.time, alpha });
  }
}

export function drawBoard(ctx, theme, view) {
  const layout = layoutFor(view.size);
  drawBoardFrame(ctx, layout.frame, { wood: theme.board.frame, ink: theme.ink, rim: theme.rim });
  drawCloth(ctx, theme, layout);
  for (const cell of view.targets ?? []) {
    const { x, y } = cellCentre(layout.grid, cell);
    drawLegalRing(ctx, theme, x, y, layout.radius, view.time + cell * 0.03);
  }
  drawDiscs(ctx, theme, layout, view);
  drawAbove(ctx, theme, layout, view);
}
