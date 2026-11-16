import { drawBadge, drawPendingClock, drawTurnOutline } from "./marks.js";
import { drawTile, tileDepth } from "./tiles.js";

export const FORM_TOP = Object.freeze({ place: 0.58, play: 0.8 });

const COLUMNS = 5;
const ROWS = 6;
const GAP = 0.1;
const SMALL = 0.6;
const BADGE = 0.62;
const BADGE_ROW = 1.15;
const BETWEEN = 0.5;
const ROW_SHARE = 0.8;
const PENDING_ALPHA = 0.55;

const widthOf = (tile) => tile * (COLUMNS + (COLUMNS - 1) * GAP);
const heightOf = (tile, rows) => tile * (rows + (rows - 1) * GAP) + tileDepth(tile);

const gridAt = (x, y, tile, rows) => ({ x, y, w: widthOf(tile), h: heightOf(tile, rows), tile, gap: tile * GAP, rows });

function withBadge(grid, y, size) {
  return Object.freeze({ ...grid, badge: Object.freeze({ x: grid.x + grid.w / 2, y, size }) });
}

function playLayout(size, pad) {
  const room = size * FORM_TOP.play - pad * 2;
  const wide = widthOf(1) * (1 + SMALL) + BETWEEN;
  const tall = BADGE_ROW + heightOf(1, ROWS);
  const tile = Math.min((size - pad * 2) / wide, room / tall);
  const left = (size - wide * tile) / 2;
  const top = pad + (room - tall * tile) / 2;
  const y = top + BADGE_ROW * tile;
  const badgeY = top + (BADGE_ROW * tile) / 2;
  const mine = gridAt(left, y, tile, ROWS);
  const theirs = gridAt(left + mine.w + BETWEEN * tile, y, tile * SMALL, ROWS);
  return { mine: withBadge(mine, badgeY, tile * BADGE), theirs: withBadge(theirs, badgeY, tile * BADGE) };
}

function placeLayout(size, pad) {
  const room = size * FORM_TOP.place - pad * 2;
  const tall = BADGE_ROW + heightOf(1, 1);
  const tile = Math.min((size - pad * 2) / widthOf(1), (size * ROW_SHARE) / widthOf(1), room / tall);
  const top = pad + (room - tall * tile) / 2;
  const row = gridAt((size - widthOf(tile)) / 2, top + BADGE_ROW * tile, tile, 1);
  return { row: withBadge(row, top + (BADGE_ROW * tile) / 2, tile * BADGE) };
}

const layouts = new Map();

export function layoutFor(size, phase) {
  const key = `${size}:${phase}`;
  if (!layouts.has(key)) {
    const pad = Math.max(7, size * 0.02);
    layouts.set(key, Object.freeze(phase === "place" ? placeLayout(size, pad) : playLayout(size, pad)));
  }
  return layouts.get(key);
}

export function tileBox(grid, row, column) {
  return { x: grid.x + column * (grid.tile + grid.gap), y: grid.y + row * (grid.tile + grid.gap), w: grid.tile, h: grid.tile };
}

export function typingLine(size, phase, row) {
  const layout = layoutFor(size, phase);
  const grid = phase === "place" ? layout.row : layout.mine;
  const tile = tileBox(grid, Math.min(row, grid.rows - 1), 0);
  const top = tile.y + tile.h + tileDepth(tile.h) + grid.gap * 2;
  return { top: top / size, reach: (top - tile.y + grid.gap) / size };
}

function drawRow(ctx, theme, grid, row, line = {}) {
  const { word = "", answer = "", typing = false, pending = false, flips = null } = line;
  for (let column = 0; column < COLUMNS; column += 1) {
    const box = tileBox(grid, row, column);
    const letter = word[column] ?? "";
    drawTile(ctx, theme, box.x, box.y, box.w, { letter, mark: answer[column] ?? "", flip: flips?.[column] ?? 1, typing: typing && Boolean(letter), alpha: pending ? PENDING_ALPHA : 1 });
  }
  if (pending) {
    const box = tileBox(grid, row, COLUMNS - 1);
    const clock = Math.max(10, box.w * 0.42);
    drawPendingClock(ctx, theme, box.x + box.w - clock * 0.35, box.y + clock * 0.35, clock);
  }
}

function drawGrid(ctx, theme, grid, data, turn) {
  const active = turn === data.side;
  if (active) drawTurnOutline(ctx, theme, grid, data.side);
  drawBadge(ctx, theme, grid.badge.x, grid.badge.y, grid.badge.size, data.side, { active });
  for (let row = 0; row < grid.rows; row += 1) drawRow(ctx, theme, grid, row, data.rows[row]);
}

export function drawBoard(ctx, theme, view) {
  const layout = layoutFor(view.size, view.phase);
  if (view.phase === "place") {
    drawGrid(ctx, theme, layout.row, { side: view.secret.side, rows: [view.secret] }, view.turn);
    return;
  }
  drawGrid(ctx, theme, layout.mine, view.mine, view.turn);
  drawGrid(ctx, theme, layout.theirs, view.theirs, view.turn);
}
