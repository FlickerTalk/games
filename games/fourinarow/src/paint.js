import { circle, line, paint, roundedRect } from "../../../kit/src/canvas/pen.js";
import { drawColumnBracket, drawDropArrow, drawLandingBurst, drawLastMove, drawPendingClock, drawWinningLine } from "./marks.js";
import { drawDisc } from "./pieces.js";
import { COLUMNS, FOURS, ROWS } from "./rules.js";

const HEAD = 0.95;
const TALL = 6.34;
const OVERHANG = 0.06;
const RIM = 3;
const layouts = new Map();

export function layoutFor(size) {
  if (!layouts.has(size)) {
    const line = Math.max(3, size * 0.0096);
    const room = size - (line + RIM);
    const cell = Math.min(room / (COLUMNS + 2 * OVERHANG), room / (HEAD + TALL));
    const w = cell * COLUMNS;
    const top = (size - cell * (HEAD + TALL)) / 2;
    layouts.set(size, Object.freeze({ size, cell, line, x: (size - w) / 2, y: top + HEAD * cell, w, h: cell * TALL, top, radius: cell * 0.39 }));
  }
  return layouts.get(size);
}

export const rowY = (layout, row) => layout.y + (row + 0.5) * layout.cell;
export const columnX = (layout, column) => layout.x + (column + 0.5) * layout.cell;
export const holeCentre = (layout, cell) => ({ x: columnX(layout, cell % COLUMNS), y: rowY(layout, Math.floor(cell / COLUMNS)) });
export const columnBox = (layout, column) => ({ x: layout.x + column * layout.cell, y: layout.top, w: layout.cell, h: layout.y + layout.h - layout.top });

const framePath = (ctx, { x, y, w, h, cell }) => roundedRect(ctx, x, y, w, h, cell * 0.25);

const basePath = (ctx, { x, y, w, cell }) => roundedRect(ctx, x - cell * OVERHANG, y + cell * 5.89, w + cell * 2 * OVERHANG, cell * 0.45, cell * 0.16);

function drawFrame(ctx, theme, layout) {
  const { x, y, w, cell, line: width } = layout;
  if (theme.rim) {
    for (const path of [framePath, basePath]) {
      path(ctx, layout);
      paint(ctx, null, theme.rim, width + RIM);
    }
  }
  framePath(ctx, layout);
  paint(ctx, theme.board.wood, theme.ink, width);
  roundedRect(ctx, x + cell * 0.08, y + cell * 0.08, w - cell * 0.16, cell * 0.15, cell * 0.07);
  paint(ctx, theme.board.rail);
  for (let hole = 0; hole < COLUMNS * ROWS; hole += 1) {
    const centre = holeCentre(layout, hole);
    circle(ctx, centre.x, centre.y, layout.radius + cell * 0.035, theme.board.edge);
    circle(ctx, centre.x, centre.y, layout.radius, theme.board.hole, theme.ink, Math.max(2, cell * 0.045));
  }
}

function drawBase(ctx, theme, layout) {
  const { x, y, w, cell } = layout;
  basePath(ctx, layout);
  paint(ctx, theme.board.edge, theme.ink, Math.max(3, cell * 0.06));
  roundedRect(ctx, x + cell * 0.12, y + cell * 5.96, w - cell * 0.24, cell * 0.13, cell * 0.06);
  paint(ctx, theme.board.rail);
  for (const share of [0.19, COLUMNS - 0.19]) {
    const [sx, sy] = [x + cell * share, y + cell * 5.98];
    circle(ctx, sx, sy, cell * 0.065, theme.board.rail, theme.ink, 1.5);
    line(ctx, [[sx - cell * 0.035, sy], [sx + cell * 0.035, sy]], theme.board.edge, 1.5);
  }
}

function drawSettled(ctx, theme, layout, view) {
  const hidden = new Set(view.hidden);
  const winning = new Set(view.line ?? []);
  view.cells.forEach((side, cell) => {
    if (side === null || hidden.has(cell)) return;
    const { x, y } = holeCentre(layout, cell);
    const ring = winning.has(cell);
    drawDisc(ctx, theme, x, y, layout.radius, { side, ring, scale: ring ? 1 + view.glow * 0.055 : 1, alpha: view.pending && cell === view.last ? 0.55 : 1 });
  });
  if (view.last === null || view.falling) return;
  const { x, y } = holeCentre(layout, view.last);
  if (!view.line) drawLastMove(ctx, theme, x, y, layout.radius);
  if (view.pending) drawPendingClock(ctx, theme, x, y, layout.cell);
}

function drawAim(ctx, theme, layout, view) {
  const { cell } = layout;
  if (view.chosen !== null) {
    const box = columnBox(layout, view.chosen);
    drawColumnBracket(ctx, theme, { ...box, y: layout.y - cell * 0.48, h: layout.h + cell * 0.46 }, cell, view.time);
  }
  const columns = view.chosen === null || view.open.includes(view.chosen) ? view.open : [...view.open, view.chosen];
  for (const column of columns) {
    const chosen = column === view.chosen;
    drawDropArrow(ctx, theme, columnX(layout, column), layout.y - cell * 0.12, cell, { chosen, bob: chosen ? Math.sin(view.time * 5) * cell * 0.045 : 0 });
  }
}

function drawWin(ctx, theme, layout, view) {
  const winning = new Set(view.line);
  const fours = FOURS.filter((four) => four.every((cell) => winning.has(cell))).map((four) => [holeCentre(layout, four[0]), holeCentre(layout, four[3])]);
  drawWinningLine(ctx, theme, fours, layout.cell, view.glow);
}

export function drawBoard(ctx, theme, view) {
  const layout = layoutFor(view.size);
  drawFrame(ctx, theme, layout);
  drawSettled(ctx, theme, layout, view);
  if (view.falling) {
    const { side, column, row } = view.falling;
    drawDisc(ctx, theme, columnX(layout, column), rowY(layout, row), layout.radius, { side, rim: row < -0.5 ? theme.rim : null });
  }
  drawAim(ctx, theme, layout, view);
  if (view.line && !view.falling) drawWin(ctx, theme, layout, view);
  if (view.burst) {
    const { x, y } = holeCentre(layout, view.burst.cell);
    drawLandingBurst(ctx, theme, x, y, layout.radius, view.burst.progress, view.burst.side);
  }
  drawBase(ctx, theme, layout);
}
