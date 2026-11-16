import { boardFrame, drawBoardFrame, drawPieceShadow } from "../../../kit/src/tabletop/frame.js";
import { cellBox, cellCentre, gridIn } from "../../../kit/src/tabletop/grid.js";
import { along } from "../../../kit/src/tabletop/motion.js";
import { hash, line } from "../../../kit/src/canvas/pen.js";
import { drawCaptureBurst, drawCrownSparkles, drawForcedHint, drawJumpArc, drawLastMove, drawLegalTarget, drawPendingClock, drawSelected } from "./marks.js";
import { drawPiece } from "./pieces.js";
import { isKing, sideOf } from "./rules.js";

const SIDE = 8;
const layouts = new Map();

export function layoutFor(size) {
  if (!layouts.has(size)) {
    const frame = boardFrame(size);
    const grid = gridIn(frame.inner, { columns: SIDE });
    layouts.set(size, { frame, grid, radius: grid.cell * 0.36 });
  }
  return layouts.get(size);
}

function drawSquares(ctx, theme, grid) {
  const { light, dark, grain } = theme.board;
  for (let index = 0; index < SIDE * SIDE; index += 1) {
    const box = cellBox(grid, index);
    const odd = (Math.floor(index / SIDE) + (index % SIDE)) % 2 === 1;
    ctx.fillStyle = odd ? dark : light;
    ctx.fillRect(box.x, box.y, box.w + 0.3, box.h + 0.3);
    const offset = hash(index) * 0.25;
    ctx.save();
    ctx.globalAlpha = 0.34;
    line(ctx, [[box.x + box.w * 0.13, box.y + box.h * (0.28 + offset)], [box.x + box.w * 0.45, box.y + box.h * (0.24 + offset)], [box.x + box.w * 0.84, box.y + box.h * (0.3 + offset)]], grain, Math.max(0.7, box.w * 0.025));
    ctx.restore();
  }
}

function drawGroundMarks(ctx, theme, grid, view) {
  const at = (cell) => cellCentre(grid, cell, { flipped: view.flipped });
  if (view.last && !view.moving) drawLastMove(ctx, theme, at(view.last[0]), at(view.last[1]), grid.cell);
  for (const cell of view.selected ?? []) {
    const point = at(cell);
    drawSelected(ctx, theme, point.x, point.y, grid.cell, view.time);
  }
  for (const { cell, capture } of view.targets ?? []) {
    const point = at(cell);
    drawLegalTarget(ctx, theme, point.x, point.y, grid.cell, { capture, time: view.time });
  }
}

function drawStanding(ctx, theme, point, radius, piece, { lift = 0, alpha = 1, crown } = {}) {
  drawPieceShadow(ctx, point.x, point.y, radius, { colour: theme.ink, lift });
  drawPiece(ctx, theme, point.x, point.y, radius, { side: sideOf(piece), king: isKing(piece), crown, lift, alpha });
}

function drawPieces(ctx, theme, layout, view) {
  const { grid, radius } = layout;
  const hidden = new Set(view.hidden ?? []);
  const at = (cell) => cellCentre(grid, cell, { flipped: view.flipped });
  view.cells.forEach((piece, cell) => {
    if (piece === null || hidden.has(cell)) return;
    const lift = cell === view.selected?.[0] ? (0.5 + 0.5 * Math.sin(view.time * 4)) * radius * 0.16 : 0;
    drawStanding(ctx, theme, at(cell), radius, piece, { lift, alpha: cell === view.pending ? 0.55 : 1 });
  });
  for (const { cell, piece } of view.standing ?? []) drawStanding(ctx, theme, at(cell), radius, piece);
}

function drawMoving(ctx, theme, layout, view) {
  const { grid, radius } = layout;
  const { piece, path, hops, progress, crown } = view.moving;
  const points = path.map((cell) => cellCentre(grid, cell, { flipped: view.flipped }));
  const spot = along(points, progress, { hop: (leg) => (hops[leg] ? grid.cell * 0.42 : 0) });
  if (hops[spot.segment] && progress < 1) drawJumpArc(ctx, theme, points[spot.segment], points[spot.segment + 1], grid.cell, spot.local);
  const size = hops[spot.segment] ? radius * (1 + 0.11 * Math.sin(spot.local * Math.PI)) : radius;
  drawPieceShadow(ctx, spot.x, spot.y + spot.lift, size, { colour: theme.ink, lift: spot.lift });
  drawPiece(ctx, theme, spot.x, spot.y, size, { side: sideOf(piece), crown: crown ?? (isKing(piece) ? 1 : 0) });
}

function drawAbove(ctx, theme, layout, view) {
  const { grid, radius } = layout;
  const at = (cell) => cellCentre(grid, cell, { flipped: view.flipped });
  for (const { cell, progress } of view.bursts ?? []) drawCaptureBurst(ctx, theme, at(cell).x, at(cell).y, grid.cell, progress);
  if (view.sparkle) drawCrownSparkles(ctx, theme, at(view.sparkle.cell).x, at(view.sparkle.cell).y, grid.cell, view.sparkle.progress);
  for (const cell of view.forced ?? []) drawForcedHint(ctx, theme, at(cell).x, at(cell).y, grid.cell, view.time);
  if (view.pending !== null && view.pending !== undefined && !view.moving) drawPendingClock(ctx, theme, at(view.pending).x, at(view.pending).y, grid.cell);
  if (view.floating) {
    const { piece, x, y, lift } = view.floating;
    drawStanding(ctx, theme, { x, y }, radius, piece, { lift });
  }
}

export function drawBoard(ctx, theme, view) {
  const layout = layoutFor(view.size);
  drawBoardFrame(ctx, layout.frame, { wood: theme.board.frame, ink: theme.ink, rim: theme.rim });
  drawSquares(ctx, theme, layout.grid);
  drawGroundMarks(ctx, theme, layout.grid, view);
  drawPieces(ctx, theme, layout, view);
  if (view.moving) drawMoving(ctx, theme, layout, view);
  drawAbove(ctx, theme, layout, view);
}
