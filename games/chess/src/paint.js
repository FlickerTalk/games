import { boardFrame, drawBoardFrame, drawPieceShadow } from "../../../kit/src/tabletop/frame.js";
import { cellBox, cellCentre, gridIn } from "../../../kit/src/tabletop/grid.js";
import { hash, line, roundedRect } from "../../../kit/src/canvas/pen.js";
import { drawCaptureRing, drawCaptureTarget, drawCastlePath, drawCheck, drawLastMove, drawLegalDot, drawPendingClock, drawSelection } from "./marks.js";
import { drawPiece } from "./pieces.js";
import { drawPromotion } from "./promotion.js";
import { SIDE, colourOf, nameOf } from "./squares.js";

const SHAKE = 0.08;
const layouts = new Map();

const given = (value) => value !== null && value !== undefined;

export function layoutFor(size) {
  if (!layouts.has(size)) {
    const frame = boardFrame(size, { padding: 0.016, radius: 0.02, depth: 0.008, least: 3 });
    const grid = gridIn(frame.inner, { columns: SIDE });
    layouts.set(size, { frame, grid, piece: grid.cell * 0.9 });
  }
  return layouts.get(size);
}

function drawSquares(ctx, theme, grid) {
  const { light, dark, grain } = theme.board;
  ctx.save();
  roundedRect(ctx, grid.x, grid.y, grid.w, grid.h, grid.cell * 0.06);
  ctx.clip();
  for (let index = 0; index < SIDE * SIDE; index += 1) {
    const box = cellBox(grid, index);
    ctx.fillStyle = (Math.floor(index / SIDE) + (index % SIDE)) % 2 ? dark : light;
    ctx.fillRect(box.x, box.y, box.w + 0.3, box.h + 0.3);
    const offset = hash(index) * 0.35;
    line(ctx, [[box.x + box.w * 0.12, box.y + box.h * (0.32 + offset)], [box.x + box.w * 0.48, box.y + box.h * (0.29 + offset)], [box.x + box.w * 0.84, box.y + box.h * (0.35 + offset)]], grain, Math.max(0.7, box.w * 0.014));
  }
  ctx.restore();
}

function drawCoordinates(ctx, theme, grid, flipped) {
  const { cell } = grid;
  const toneOn = (row, column) => ((row + column) % 2 ? theme.board.light : theme.board.frame);
  ctx.save();
  ctx.font = `700 ${Math.max(8, cell * 0.2)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let column = 0; column < SIDE; column += 1) {
    ctx.fillStyle = toneOn(SIDE - 1, column);
    ctx.fillText(nameOf(flipped ? SIDE - 1 - column : column)[0], grid.x + (column + 0.89) * cell, grid.y + grid.h - cell * 0.13);
  }
  for (let row = 0; row < SIDE; row += 1) {
    ctx.fillStyle = toneOn(row, 0);
    ctx.fillText(String(flipped ? row + 1 : SIDE - row), grid.x + cell * 0.11, grid.y + (row + 0.5) * cell);
  }
  ctx.restore();
}

function drawGround(ctx, theme, grid, view, at) {
  if (view.last && !view.moving?.length) for (const cell of view.last) drawLastMove(ctx, theme, at(cell).x, at(cell).y, grid.cell, { pending: given(view.pending) });
  if (given(view.check)) drawCheck(ctx, theme, at(view.check).x, at(view.check).y, grid.cell);
  if (given(view.selected)) drawSelection(ctx, theme, at(view.selected).x, at(view.selected).y, grid.cell);
  for (const { cell, capture } of view.targets ?? []) (capture ? drawCaptureTarget : drawLegalDot)(ctx, theme, at(cell).x, at(cell).y, grid.cell);
}

const rimOf = (theme, piece) => (colourOf(piece) === 1 ? theme.rim : null);

function drawStanding(ctx, theme, layout, view, at) {
  const hidden = new Set(view.hidden ?? []);
  const shaken = new Map((view.shakes ?? []).map(({ cell, offset }) => [cell, offset]));
  view.cells.forEach((piece, cell) => {
    if (!piece || hidden.has(cell)) return;
    const point = at(cell);
    const x = point.x + (shaken.get(cell) ?? 0) * layout.grid.cell * SHAKE;
    drawPiece(ctx, theme, piece, x, point.y, layout.piece, { alpha: cell === view.pending ? 0.55 : 1, rim: rimOf(theme, piece) });
  });
  for (const { cell, piece } of view.standing ?? []) drawPiece(ctx, theme, piece, at(cell).x, at(cell).y, layout.piece, { rim: rimOf(theme, piece) });
}

function drawMoving(ctx, theme, layout, view, at) {
  for (const { from, to, progress } of view.paths ?? []) drawCastlePath(ctx, theme, at(from), at(to), layout.grid.cell, progress);
  for (const { piece, from, to, progress } of view.moving ?? []) {
    const [start, end] = [at(from), at(to)];
    drawPiece(ctx, theme, piece, start.x + (end.x - start.x) * progress, start.y + (end.y - start.y) * progress, layout.piece, { rim: rimOf(theme, piece) });
  }
}

function drawAbove(ctx, theme, layout, view, at) {
  const { grid } = layout;
  for (const { cell, progress } of view.bursts ?? []) drawCaptureRing(ctx, theme, at(cell).x, at(cell).y, grid.cell, progress);
  if (given(view.pending) && !view.moving?.length) drawPendingClock(ctx, theme, at(view.pending).x, at(view.pending).y, grid.cell);
  if (view.floating) {
    const { piece, x, y, lift } = view.floating;
    drawPieceShadow(ctx, x, y + layout.piece * 0.38, layout.piece * 0.3, { colour: theme.ink, lift });
    drawPiece(ctx, theme, piece, x, y - lift, layout.piece, { rim: rimOf(theme, piece) });
  }
  if (given(view.promoting)) drawPromotion(ctx, theme, grid, view.promoting);
}

export function drawBoard(ctx, theme, view) {
  const layout = layoutFor(view.size);
  const at = (cell) => cellCentre(layout.grid, cell, { flipped: view.flipped });
  drawBoardFrame(ctx, layout.frame, { wood: theme.board.frame, ink: theme.ink, rim: theme.rim });
  drawSquares(ctx, theme, layout.grid);
  drawCoordinates(ctx, theme, layout.grid, view.flipped);
  drawGround(ctx, theme, layout.grid, view, at);
  drawStanding(ctx, theme, layout, view, at);
  drawMoving(ctx, theme, layout, view, at);
  drawAbove(ctx, theme, layout, view, at);
}
