import { drawBoardFrame, drawPieceShadow } from "../../../kit/src/tabletop/frame.js";
import { easeInOut } from "../../../kit/src/tabletop/motion.js";
import { clamp, ease, ellipse, paint, roundedRect } from "../../../kit/src/canvas/pen.js";
import { drawActiveRow, drawCaptureBurst, drawCount, drawLastMark, drawLegalRing, drawPendingClock, drawStoreSparkles } from "./marks.js";
import { drawSeed, drawSeeds } from "./pieces.js";
import { PITS, STORE } from "./rules.js";

const RIM = 3;
const TALL = 0.56;
const ROW = 0.67;
const DESIGN_WIDTH = 368;
const ALL = 2 * PITS + 2;
const layouts = new Map();

const isStore = (shown) => shown === STORE[0] || shown === STORE[1];
const atBottom = (shown) => shown < PITS || shown === STORE[0];
const shownOf = (pit, flipped) => (flipped ? (pit + PITS + 1) % ALL : pit);
const columnOf = (shown) => (shown < PITS ? shown : 2 * PITS - shown);

function placesIn(tray, grid, radius, unit) {
  const { x, y, w, h } = tray;
  const store = (cx) => ({ x: cx, y: y + h / 2, rx: grid.store * 0.46, ry: h * (ROW - 0.5) + radius + 4 * unit });
  return Array.from({ length: ALL }, (_, shown) => {
    if (shown === STORE[0]) return store(x + w - grid.pad - grid.store / 2);
    if (shown === STORE[1]) return store(x + grid.pad + grid.store / 2);
    return { x: grid.x + (columnOf(shown) + 0.5) * grid.cell, y: y + h * (atBottom(shown) ? ROW : 1 - ROW), rx: radius, ry: radius };
  });
}

function measure(size) {
  const line = Math.max(2.5, size * 0.009);
  const margin = (line + RIM) / 2;
  const w = size - 2 * margin;
  const h = w * TALL;
  const depth = w * 0.012;
  const tray = { x: margin, y: (size - h - depth) / 2, w, h };
  const pad = w * 0.022;
  const store = w * 0.085;
  const gap = w * 0.008;
  const cell = (w - 2 * pad - 2 * store - 2 * gap) / PITS;
  const grid = { x: tray.x + pad + store + gap, cell, pad, store };
  const radius = Math.min(cell * 0.41, h * 0.165);
  const unit = w / DESIGN_WIDTH;
  const places = placesIn(tray, grid, radius, unit);
  const font = clamp(cell * 0.34, 11, 22);
  const below = radius + 13 * unit + font / 2;
  const counts = { top: places[PITS + 1].y - below, bottom: places[0].y + below };
  return Object.freeze({ size, tray, grid, radius, unit, places, counts, font, inset: 5 * unit, frame: { outer: tray, depth, radius: h * 0.15, line } });
}

export function layoutFor(size) {
  if (!layouts.has(size)) layouts.set(size, measure(size));
  return layouts.get(size);
}

export const pitAt = (layout, pit, flipped = false) => layout.places[shownOf(pit, flipped)];

export function countAt(layout, pit, flipped = false) {
  const shown = shownOf(pit, flipped);
  return { x: layout.places[shown].x, y: atBottom(shown) ? layout.counts.bottom : layout.counts.top };
}

export function pitBox(layout, pit, flipped = false) {
  const shown = shownOf(pit, flipped);
  const { tray, grid, frame } = layout;
  if (isStore(shown)) return { x: layout.places[shown].x - grid.store / 2, y: tray.y, w: grid.store, h: tray.h + frame.depth };
  const x = grid.x + columnOf(shown) * grid.cell;
  return atBottom(shown) ? { x, y: tray.y + tray.h / 2, w: grid.cell, h: tray.h / 2 + frame.depth } : { x, y: tray.y, w: grid.cell, h: tray.h / 2 };
}

export function rowBox(layout, bottom) {
  const { tray, grid, unit, counts, font } = layout;
  const middle = tray.y + tray.h / 2;
  const [top, end] = bottom ? [middle + 4 * unit, counts.bottom + font / 2 + 6 * unit] : [counts.top - font / 2 - 6 * unit, middle - 4 * unit];
  return { x: grid.x - 5 * unit, y: top, w: grid.cell * PITS + 10 * unit, h: end - top };
}

function drawTray(ctx, theme, layout) {
  const { tray, unit, inset } = layout;
  const { wood, detail } = theme.board;
  drawBoardFrame(ctx, layout.frame, { wood, ink: theme.ink, rim: theme.rim });
  ctx.save();
  roundedRect(ctx, tray.x + inset, tray.y + inset, tray.w - 2 * inset, tray.h - 2 * inset, tray.h * 0.12);
  paint(ctx, null, detail, 2 * unit);
  ctx.globalAlpha = 0.45;
  for (let grain = 0; grain < 5; grain += 1) {
    const y = tray.y + tray.h * (0.12 + grain * 0.19);
    ctx.beginPath();
    ctx.moveTo(tray.x + tray.w * 0.12, y);
    ctx.bezierCurveTo(tray.x + tray.w * 0.3, y - 5 * unit, tray.x + tray.w * 0.62, y + 6 * unit, tray.x + tray.w * 0.88, y - unit);
    paint(ctx, null, detail, 2 * unit);
  }
  ctx.restore();
}

function drawHollow(ctx, theme, place, unit, store) {
  const { edge, hollow, deep, detail } = theme.board;
  const width = Math.max(1.5, 2.5 * unit);
  ctx.save();
  ellipse(ctx, place.x, place.y + 2 * unit, place.rx + 2 * unit, place.ry + 2 * unit, edge, theme.ink, width);
  ellipse(ctx, place.x, place.y, place.rx, place.ry, hollow, theme.ink, width);
  ctx.globalAlpha = 0.35;
  ellipse(ctx, place.x, place.y + place.ry * 0.14, place.rx * 0.82, place.ry * 0.72, deep);
  if (store) {
    ctx.globalAlpha = 0.5;
    ellipse(ctx, place.x, place.y, place.rx * 0.72, place.ry * 0.94, null, detail, 2 * unit);
  }
  ctx.restore();
}

function drawHollows(ctx, theme, layout, view) {
  for (let pit = 0; pit < ALL; pit += 1) {
    const place = pitAt(layout, pit, view.flipped);
    const store = isStore(pit);
    drawHollow(ctx, theme, place, layout.unit, store);
    drawSeeds(ctx, theme, place.x, place.y, place.rx * (store ? 0.82 : 0.76), place.ry * (store ? 0.76 : 0.74), view.pits[pit]);
    const count = countAt(layout, pit, view.flipped);
    drawCount(ctx, theme, view.counts[pit], count.x, count.y, layout.font);
  }
}

function drawMarks(ctx, theme, layout, view) {
  for (const pit of view.open ?? []) drawLegalRing(ctx, theme, pitAt(layout, pit, view.flipped), pit < PITS ? 0 : 1, { below: atBottom(shownOf(pit, view.flipped)) });
  if (view.last === null || view.last === undefined) return;
  const place = pitAt(layout, view.last, view.flipped);
  drawLastMark(ctx, theme, place);
  if (view.pending) drawPendingClock(ctx, theme, place);
}

function arcPoint(from, to, amount, lift) {
  const t = easeInOut(amount);
  const raise = Math.sin(t * Math.PI) * lift;
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t - raise, raise };
}

function drawHop(ctx, theme, layout, view) {
  const { from, to, progress } = view.hop;
  const size = clamp(layout.radius * 0.66, 7, 30);
  const spot = arcPoint(pitAt(layout, from, view.flipped), pitAt(layout, to, view.flipped), progress, size * 1.6);
  drawPieceShadow(ctx, spot.x, spot.y, size * 0.5, { colour: theme.ink, lift: spot.raise });
  drawSeed(ctx, theme, spot.x, spot.y, size, from, progress * 2);
}

function curvePoint(start, control, end, amount) {
  const [t, u] = [clamp(amount), 1 - clamp(amount)];
  return { x: u * u * start.x + 2 * u * t * control.x + t * t * end.x, y: u * u * start.y + 2 * u * t * control.y + t * t * end.y };
}

function drawCapture(ctx, theme, layout, view) {
  const { landing, across, store, side, progress } = view.capture;
  const sources = [pitAt(layout, landing, view.flipped), pitAt(layout, across, view.flipped)];
  const target = pitAt(layout, store, view.flipped);
  drawCaptureBurst(ctx, theme, sources[1], side, progress);
  const size = clamp(layout.radius * 0.5, 6, 24);
  for (let seed = 0; seed < 6; seed += 1) {
    const local = clamp((progress - seed * 0.055) / 0.72);
    if (local <= 0) continue;
    const source = sources[seed % 2];
    const control = { x: (source.x + target.x) / 2, y: Math.min(source.y, target.y) - (60 + seed * 3) * layout.unit };
    const point = curvePoint(source, control, target, ease(local));
    drawSeed(ctx, theme, point.x, point.y, size, seed, local * 4);
  }
}

export function drawBoard(ctx, theme, view) {
  const layout = layoutFor(view.size);
  drawTray(ctx, theme, layout);
  if (view.active === 0 || view.active === 1) drawActiveRow(ctx, theme, rowBox(layout, (view.active === 1) === Boolean(view.flipped)), view.active);
  drawHollows(ctx, theme, layout, view);
  drawMarks(ctx, theme, layout, view);
  if (view.capture) drawCapture(ctx, theme, layout, view);
  if (view.hop) drawHop(ctx, theme, layout, view);
  if (view.sparkle) drawStoreSparkles(ctx, theme, pitAt(layout, view.sparkle.store, view.flipped), view.sparkle.progress);
}
