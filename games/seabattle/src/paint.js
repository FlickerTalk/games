import { boardFrame, drawBoardFrame } from "../../../kit/src/tabletop/frame.js";
import { cellCentre, gridIn } from "../../../kit/src/tabletop/grid.js";
import { drawRoundButton } from "../../../kit/src/canvas/buttons.js";
import { line } from "../../../kit/src/canvas/pen.js";
import { drawAim, drawFoundBurst, drawHit, drawLastShot, drawMiss, drawOpenDot, drawPendingClock } from "./marks.js";
import { drawBoat, drawFleetChip, drawSideMark } from "./pieces.js";
import { SHIPS, SIZE, shipCells } from "./rules.js";

const CONFIRM = 44;
const AIM = 52;
const FONT = "system-ui, sans-serif";
const DIMMED = 0.45;
const SHOWN_ALPHA = 0.7;
const FOUND_TILT = -0.12;
const layouts = new Map();

const shift = (box, dx, dy) => ({ ...box, x: box.x + dx, y: box.y + dy });

function seaAt(x, y, side, options) {
  const frame = boardFrame(side, options);
  const moved = { ...frame, outer: shift(frame.outer, x, y), inner: shift(frame.inner, x, y) };
  return { frame: moved, grid: gridIn(moved.inner, { columns: SIZE }) };
}

function chipsIn(x, right, y, h) {
  const gap = Math.max(2, Math.min(7, (right - x) * 0.035));
  const cell = (right - x - gap * (SHIPS.length - 1)) / SHIPS.reduce((sum, length) => sum + length, 0);
  const tall = Math.min(h * 0.4, Math.max(cell * 0.56, h * 0.2));
  let at = x;
  return SHIPS.map((length) => {
    const chip = { x: at, y: y + (h - tall) / 2, w: length * cell, h: tall, length };
    at += length * cell + gap;
    return chip;
  });
}

function rowLayout(box) {
  const size = Math.min(box.h * 0.62, 28);
  const mark = { x: box.x + size / 2 + 1, y: box.y + box.h / 2, size };
  const font = Math.min(box.h * 0.5, 22);
  const count = font >= 11 ? { x: box.x + box.w - font * 1.9, y: box.y + (box.h - font) / 2, w: font * 1.9, h: font, font } : null;
  const left = box.x + size + 2 + box.h * 0.2;
  const right = count ? count.x - box.h * 0.15 : box.x + box.w;
  return { box, mark, count, chips: chipsIn(left, right, box.y, box.h) };
}

function placeLayout(size) {
  const side = size * 0.79;
  const top = side + size * 0.02;
  const band = size - top;
  const ready = Math.min(band * 0.92, size * 0.2);
  const shuffle = ready * 0.86;
  const y = top + band / 2;
  return {
    sea: seaAt((size - side) / 2, 0, side, { padding: 0.03 }),
    shuffle: { x: size / 2 - ready * 0.75, y, d: shuffle },
    ready: { x: size / 2 + ready * 0.75, y, d: ready },
  };
}

function fireLayout(size) {
  const side = size * 0.72;
  const margin = Math.max(2, size * 0.015);
  const top = side + size * 0.025;
  const low = size - top;
  const left = margin + low + size * 0.03;
  const rows = [0, 1].map((at) => rowLayout({ x: left, y: top + (at * low) / 2, w: size - margin - left, h: low / 2 }));
  return { theirs: seaAt((size - side) / 2, 0, side, { padding: 0.03 }), mine: seaAt(margin, top, low), rows };
}

export function layoutFor(size) {
  if (!layouts.has(size)) layouts.set(size, Object.freeze({ size, place: placeLayout(size), fire: fireLayout(size) }));
  return layouts.get(size);
}

export function confirmBox({ fire }, cell) {
  const { outer } = fire.theirs.frame;
  const side = Math.min(outer.w, Math.max(CONFIRM, fire.theirs.grid.cell));
  const { x, y } = cellCentre(fire.theirs.grid, cell);
  const place = (centre, start, length) => Math.min(Math.max(centre - side / 2, start), start + length - side);
  return { x: place(x, outer.x, outer.w), y: place(y, outer.y, outer.h), w: side, h: side };
}

export function aimSize({ size, fire }, cell) {
  const { x, y } = cellCentre(fire.theirs.grid, cell);
  const room = 2 * Math.min(x, y, size - x, size - y) - 2;
  return Math.min(Math.max(AIM, fire.theirs.grid.cell * 1.45), room);
}

function drawWater(ctx, theme, { frame, grid }) {
  const { water, line: colour, edge } = theme.board;
  drawBoardFrame(ctx, frame, { wood: edge, ink: theme.ink, rim: theme.rim });
  ctx.fillStyle = water;
  ctx.fillRect(grid.x, grid.y, grid.w, grid.h);
  ctx.save();
  ctx.beginPath();
  for (let at = 1; at < SIZE; at += 1) {
    ctx.moveTo(grid.x + at * grid.cell, grid.y);
    ctx.lineTo(grid.x + at * grid.cell, grid.y + grid.h);
    ctx.moveTo(grid.x, grid.y + at * grid.cell);
    ctx.lineTo(grid.x + grid.w, grid.y + grid.cell * at);
  }
  ctx.strokeStyle = colour;
  ctx.lineWidth = Math.max(0.5, grid.cell * 0.035);
  ctx.stroke();
  ctx.restore();
}

function drawShip(ctx, theme, grid, ship, side, options = {}) {
  const cells = shipCells(ship);
  const [first, last] = [cellCentre(grid, cells[0]), cellCentre(grid, cells.at(-1))];
  drawBoat(ctx, theme, (first.x + last.x) / 2, (first.y + last.y) / 2, ship.len, grid.cell, { side, vertical: ship.o === "v", ...options });
}

function foundLook(ship, effects, time) {
  const lively = effects.find((effect) => effect.ship?.start === ship.start && effect.tipping < 1);
  if (!lively) return { tilt: FOUND_TILT, laugh: true };
  return { tilt: FOUND_TILT + Math.sin(time * 4) * 0.04, laugh: true, bounce: Math.sin(time * 5) };
}

function drawShots(ctx, theme, grid, shots, effects) {
  const moving = new Map(effects.filter((effect) => effect.progress < 1).map((effect) => [effect.cell, effect]));
  for (const [cell, kind] of shots) {
    if (kind === null) continue;
    const { x, y } = cellCentre(grid, cell);
    const progress = moving.get(cell)?.progress ?? 1;
    if (kind === "m") drawMiss(ctx, theme, x, y, grid.cell, progress);
    else drawHit(ctx, theme, x, y, grid.cell, progress);
  }
  for (const effect of effects) {
    if (effect.burst === null || effect.burst === undefined || !effect.ship) continue;
    const cells = shipCells(effect.ship);
    const [first, last] = [cellCentre(grid, cells[0]), cellCentre(grid, cells.at(-1))];
    drawFoundBurst(ctx, theme, (first.x + last.x) / 2, (first.y + last.y) / 2, grid.cell * 1.4, effect.burst);
  }
}

function drawTheirs(ctx, theme, layout, view) {
  const sea = layout.fire.theirs;
  const { grid } = sea;
  const waters = view.theirs;
  const at = (cell) => cellCentre(grid, cell);
  drawWater(ctx, theme, sea);
  for (const cell of waters.open ?? []) drawOpenDot(ctx, theme, at(cell).x, at(cell).y, grid.cell);
  for (const ship of waters.shown) drawShip(ctx, theme, grid, ship, 1 - view.me, { alpha: SHOWN_ALPHA });
  for (const ship of waters.found) drawShip(ctx, theme, grid, ship, 1 - view.me, foundLook(ship, waters.effects, view.time));
  drawShots(ctx, theme, grid, waters.shots, waters.effects);
  if (waters.last !== null) drawLastShot(ctx, theme, at(waters.last).x, at(waters.last).y, grid.cell);
  if (waters.pending !== null) drawPendingClock(ctx, theme, at(waters.pending).x, at(waters.pending).y, grid.cell);
  if (waters.chosen !== null) drawAim(ctx, theme, at(waters.chosen).x, at(waters.chosen).y, aimSize(layout, waters.chosen), view.time);
}

function drawMine(ctx, theme, sea, view, waters) {
  const { grid } = sea;
  drawWater(ctx, theme, sea);
  for (const { ship, found } of waters.ships) drawShip(ctx, theme, grid, ship, view.me, found ? foundLook(ship, waters.effects, view.time) : {});
  drawShots(ctx, theme, grid, waters.shots, waters.effects);
  if (waters.last !== null) {
    const { x, y } = cellCentre(grid, waters.last);
    drawLastShot(ctx, theme, x, y, grid.cell);
  }
}

function drawCount(ctx, theme, { x, y, w, h, font }, text) {
  ctx.save();
  ctx.font = `800 ${font}px ${FONT}`;
  const wide = ctx.measureText(text).width;
  if (wide > w) ctx.font = `800 ${(font * w) / wide}px ${FONT}`;
  ctx.fillStyle = theme.ui.text;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + w, y + h / 2);
  ctx.restore();
}

function drawRows(ctx, theme, rows, view) {
  rows.forEach((row, at) => {
    const { side, found, count } = view.rows[at];
    const left = [...found];
    drawSideMark(ctx, theme, row.mark.x, row.mark.y, row.mark.size, side);
    for (const chip of row.chips) {
      const hit = left.indexOf(chip.length);
      if (hit >= 0) left.splice(hit, 1);
      drawFleetChip(ctx, theme, chip, chip.length, { found: hit >= 0, side });
    }
    if (row.count && count) drawCount(ctx, theme, row.count, count);
  });
}

function drawControls(ctx, theme, { shuffle, ready }, { enabled }) {
  ctx.save();
  if (!enabled) ctx.globalAlpha = DIMMED;
  drawRoundButton(ctx, shuffleGlyph, shuffle.x, shuffle.y, shuffle.d, theme.ui);
  drawRoundButton(ctx, "check", ready.x, ready.y, ready.d, theme.ui, { primary: true });
  ctx.restore();
}

function shuffleGlyph(ctx, s, colour, width) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const turn of [1, -1]) {
    ctx.beginPath();
    ctx.moveTo(-s * 0.36, -s * 0.18 * turn);
    ctx.bezierCurveTo(-s * 0.04, -s * 0.18 * turn, s * 0.02, s * 0.18 * turn, s * 0.32, s * 0.18 * turn);
    ctx.stroke();
    line(ctx, [[s * 0.2, s * 0.06 * turn], [s * 0.34, s * 0.18 * turn], [s * 0.2, s * 0.3 * turn]], colour, width);
  }
}

export function drawBoard(ctx, theme, view) {
  const layout = layoutFor(view.size);
  if (view.mode === "place") {
    const { sea } = layout.place;
    drawWater(ctx, theme, sea);
    for (const ship of view.place.ships) drawShip(ctx, theme, sea.grid, ship, view.me);
    if (view.place.controls) drawControls(ctx, theme, layout.place, view.place.controls);
    return;
  }
  drawTheirs(ctx, theme, layout, view);
  drawMine(ctx, theme, layout.fire.mine, view, view.mine);
  drawRows(ctx, theme, layout.fire.rows, view);
}
