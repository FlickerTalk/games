import { boardFrame, drawBoardFrame } from "../../../kit/src/tabletop/frame.js";
import { cellCentre, gridIn } from "../../../kit/src/tabletop/grid.js";
import { circle, ease } from "../../../kit/src/canvas/pen.js";
import { drawLastMove, drawMiss, drawPendingClock, drawPlacementPop, drawTarget, drawWinningLine } from "./marks.js";
import { drawStone } from "./pieces.js";
import { SIZE } from "./rules.js";

const STARS = [3 * SIZE + 3, 3 * SIZE + 11, 7 * SIZE + 7, 11 * SIZE + 3, 11 * SIZE + 11];
const CONFIRM = 44;
const GHOST_ALPHA = 0.48;
const PENDING_ALPHA = 0.55;
const GRAIN_ALPHA = 0.24;
const layouts = new Map();

export function layoutFor(size) {
  if (!layouts.has(size)) {
    const frame = boardFrame(size, { padding: 0.034 });
    const grid = gridIn(frame.inner, { columns: SIZE });
    layouts.set(size, { frame, grid, radius: grid.cell * 0.42 });
  }
  return layouts.get(size);
}

export function confirmBox({ frame, grid }, cell) {
  const { outer } = frame;
  const side = Math.min(outer.w, Math.max(CONFIRM, grid.cell));
  const { x, y } = cellCentre(grid, cell);
  const place = (centre, start, length) => Math.min(Math.max(centre - side / 2, start), start + length - side);
  return { x: place(x, outer.x, outer.w), y: place(y, outer.y, outer.h), w: side, h: side };
}

function drawGrain(ctx, theme, { x, y, w, h }) {
  const wobble = w / 50;
  ctx.save();
  ctx.globalAlpha *= GRAIN_ALPHA;
  ctx.beginPath();
  for (let streak = 0; streak < 6; streak += 1) {
    const at = y + h * (0.12 + streak * 0.15);
    ctx.moveTo(x + w * 0.04, at);
    ctx.bezierCurveTo(x + w * 0.25, at - wobble, x + w * 0.38, at + wobble * 1.15, x + w * 0.56, at);
    ctx.bezierCurveTo(x + w * 0.72, at - wobble * 0.85, x + w * 0.84, at + wobble * 0.7, x + w * 0.96, at - wobble * 0.3);
  }
  ctx.strokeStyle = theme.board.grain;
  ctx.lineWidth = Math.max(1, w * 0.0055);
  ctx.stroke();
  ctx.restore();
}

function drawGrid(ctx, theme, { grid }, { size, cells }) {
  const at = (cell) => cellCentre(grid, cell);
  ctx.beginPath();
  for (let one = 0; one < SIZE; one += 1) {
    for (const [from, to] of [[one * SIZE, one * SIZE + SIZE - 1], [one, one + SIZE * (SIZE - 1)]]) {
      ctx.moveTo(at(from).x, at(from).y);
      ctx.lineTo(at(to).x, at(to).y);
    }
  }
  ctx.strokeStyle = theme.board.line;
  ctx.lineWidth = Math.max(1, size / 340);
  ctx.lineCap = "round";
  ctx.stroke();
  for (const star of STARS) if (cells[star] === null) circle(ctx, at(star).x, at(star).y, Math.max(2, size / 110), theme.board.line);
}

function drawChosen(ctx, theme, { grid, radius }, { chosen, time }) {
  const { x, y } = cellCentre(grid, chosen.cell);
  drawTarget(ctx, theme, x, y, radius, time);
  drawStone(ctx, theme, x, y, radius, { side: chosen.side, alpha: GHOST_ALPHA });
}

function drawStones(ctx, theme, { grid, radius }, view) {
  const winners = new Set(view.won?.cells ?? []);
  const cheer = view.won?.cheer ?? 0;
  view.cells.forEach((side, cell) => {
    if (side === null) return;
    const { x, y } = cellCentre(grid, cell);
    const growing = view.entering?.cell === cell ? 0.5 + 0.5 * ease(view.entering.progress) : 1;
    const bounce = winners.has(cell) ? cheer : 0;
    const scale = growing * (1 + Math.sin(view.time * 5 + cell) * 0.06 * bounce);
    const lift = Math.abs(Math.sin(view.time * 5 + side)) * radius * 0.12 * bounce;
    drawStone(ctx, theme, x, y, radius, { side, scale, lift, alpha: cell === view.pending ? PENDING_ALPHA : 1 });
  });
}

function drawAbove(ctx, theme, { frame, grid, radius }, view) {
  const at = (cell) => cellCentre(grid, cell);
  const { last, pop, won, miss, pending } = view;
  if (last !== null && view.cells[last] !== null) drawLastMove(ctx, theme, at(last).x, at(last).y, radius);
  if (pop) drawPlacementPop(ctx, theme, at(pop.cell).x, at(pop.cell).y, radius, pop.progress);
  if (won) drawWinningLine(ctx, theme, won.cells.map(at), { progress: won.progress, time: view.time, width: grid.cell * 0.45, top: frame.outer.y });
  if (miss) drawMiss(ctx, theme, at(miss.cell).x, at(miss.cell).y, radius, miss.progress);
  if (pending !== null && view.cells[pending] !== null) drawPendingClock(ctx, theme, at(pending).x, at(pending).y, grid.cell);
}

export function drawBoard(ctx, theme, view) {
  const layout = layoutFor(view.size);
  drawBoardFrame(ctx, layout.frame, { wood: theme.board.wood, ink: theme.ink, rim: theme.rim });
  drawGrain(ctx, theme, layout.frame.outer);
  drawGrid(ctx, theme, layout, view);
  if (view.chosen && view.cells[view.chosen.cell] === null) drawChosen(ctx, theme, layout, view);
  drawStones(ctx, theme, layout, view);
  drawAbove(ctx, theme, layout, view);
}
