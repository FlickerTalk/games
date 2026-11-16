import { DAY_THEME, PALETTE } from './art-palette.js';
import { drawPresent } from './art-present.js';
import { clamp, ellipse, paint, polygon, roundedRect } from './art-shapes.js';
import { drawPlayerVehicle, hasFixedColor, VEHICLE_COLORS } from './art-vehicles.js';
import { SWITCH_BAND } from './layout.js';

const SMALLEST_TILE = 96;
const LARGEST_TILE = 190;
const MAX_COLUMNS = 6;
const MAX_ROWS = 4;
const PAGE_MARKS = 18;
const FADED_DOTS = 0.3;
const WIGGLE = { every: 2.4, lasts: 0.6 };

function controlsLayout(width, height) {
  const wide = width >= 700;
  const margin = wide ? 24 : 12;
  const gap = wide ? 14 : 10;
  const spacing = clamp((width - margin * 2) / VEHICLE_COLORS.length, 44, 52);
  const doneRadius = clamp(Math.min(width, height) * 0.075, 36, 52);
  const pageRadius = clamp(doneRadius * 0.8, 26, 36);
  const oneRow = width >= margin * 2 + pageRadius * 4 + spacing * VEHICLE_COLORS.length + doneRadius * 2 + gap * 3;
  const actionsY = height - PAGE_MARKS - doneRadius;
  if (oneRow) {
    const doneX = width - margin - doneRadius;
    const nextX = doneX - doneRadius - gap - pageRadius;
    const previousX = margin + pageRadius;
    return { margin, gap, spacing, doneRadius, pageRadius, actionsY, doneX, nextX, previousX,
      dotsY: actionsY, dotsCenterX: (previousX + nextX) / 2, top: actionsY - doneRadius - gap };
  }
  const dotsY = actionsY - doneRadius - gap - spacing / 2;
  return { margin, gap, spacing, doneRadius, pageRadius, actionsY, doneX: width / 2, nextX: width - margin - pageRadius,
    previousX: margin + pageRadius, dotsY, dotsCenterX: width / 2, top: dotsY - spacing / 2 - gap };
}

function garageMetrics(width, height, count) {
  const controls = controlsLayout(width, height);
  const { margin, gap } = controls;
  const areaWidth = width - margin * 2;
  const top = controls.top - SWITCH_BAND >= SMALLEST_TILE ? SWITCH_BAND : margin;
  const areaHeight = controls.top - top;
  const columns = clamp(Math.floor((areaWidth + gap) / (SMALLEST_TILE + gap)), 1, MAX_COLUMNS);
  const rowsThatFit = clamp(Math.floor((areaHeight + gap) / (SMALLEST_TILE + gap)), 1, MAX_ROWS);
  const rows = Math.max(1, Math.min(rowsThatFit, Math.ceil(count / columns)));
  const tileWidth = Math.min(LARGEST_TILE, (areaWidth - gap * (columns - 1)) / columns);
  const tileHeight = Math.min(LARGEST_TILE, (areaHeight - gap * (rows - 1)) / rows, tileWidth * 1.35);
  const gridWidth = tileWidth * columns + gap * (columns - 1);
  const gridHeight = tileHeight * rows + gap * (rows - 1);
  return {
    columns, rows, gap, tileWidth, tileHeight,
    left: (width - gridWidth) / 2,
    top: top + (areaHeight - gridHeight) / 2,
  };
}

function pageInfo(kinds, page, perPage) {
  const pageCount = Math.max(1, Math.ceil(kinds.length / perPage));
  const current = ((Math.floor(page) % pageCount) + pageCount) % pageCount;
  return { pageCount, current };
}

export function garagePageCount(width, height, kinds) {
  const metrics = garageMetrics(width, height, kinds.length);
  return Math.max(1, Math.ceil(kinds.length / (metrics.columns * metrics.rows)));
}

export function garageTiles(width, height, kinds, page = 0) {
  const metrics = garageMetrics(width, height, kinds.length);
  const perPage = metrics.columns * metrics.rows;
  const { current } = pageInfo(kinds, page, perPage);
  return kinds.slice(current * perPage, (current + 1) * perPage).map((kind, index) => {
    const x = metrics.left + (index % metrics.columns) * (metrics.tileWidth + metrics.gap);
    const y = metrics.top + Math.floor(index / metrics.columns) * (metrics.tileHeight + metrics.gap);
    return {
      x, y, width: metrics.tileWidth, height: metrics.tileHeight, kind,
      index: current * perPage + index, centerX: x + metrics.tileWidth / 2, centerY: y + metrics.tileHeight / 2,
    };
  });
}

function circle(centerX, centerY, radius, extra = {}) {
  return { x: centerX - radius, y: centerY - radius, width: radius * 2, height: radius * 2, centerX, centerY, radius, ...extra };
}

export function garageColorDots(width, height) {
  const { spacing, dotsY, dotsCenterX } = controlsLayout(width, height);
  const start = dotsCenterX - spacing * (VEHICLE_COLORS.length - 1) / 2;
  const radius = clamp(spacing * 0.32, 15, 19);
  return VEHICLE_COLORS.map((entry, index) => {
    const centerX = start + index * spacing;
    return { x: centerX - spacing / 2, y: dotsY - spacing / 2, width: spacing, height: spacing, centerX, centerY: dotsY, radius, color: entry.id, entry };
  });
}

export function garageDoneButton(width, height) {
  const { doneX, actionsY, doneRadius } = controlsLayout(width, height);
  return circle(doneX, actionsY, doneRadius);
}

export function garagePageButtons(width, height) {
  const { previousX, nextX, actionsY, pageRadius } = controlsLayout(width, height);
  return { previous: circle(previousX, actionsY, pageRadius, { direction: -1 }), next: circle(nextX, actionsY, pageRadius, { direction: 1 }) };
}

function hasVehicle(unlocked, kind) {
  if (!unlocked) return true;
  if (typeof unlocked.has === 'function') return unlocked.has(kind);
  return unlocked.includes(kind);
}

function drawSelectionMark(ctx, x, y, radius) {
  ellipse(ctx, x, y, radius, radius, PALETTE.greenLight, PALETTE.ink, 2.5);
  ctx.beginPath();
  ctx.moveTo(x - radius * 0.45, y);
  ctx.lineTo(x - radius * 0.1, y + radius * 0.35);
  ctx.lineTo(x + radius * 0.5, y - radius * 0.38);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = Math.max(2.5, radius * 0.22);
  ctx.lineCap = 'round';
  ctx.stroke();
}

function drawGarageTile(ctx, tile, { selected, unlocked, color, time, nudge, hud }) {
  const chosen = selected === tile.kind && hasVehicle(unlocked, tile.kind);
  const corner = Math.min(24, tile.width * 0.2, tile.height * 0.2);
  ctx.globalAlpha = chosen ? 0.24 : 0.13;
  roundedRect(ctx, tile.x, tile.y + 5, tile.width, tile.height, corner);
  paint(ctx, PALETTE.ink, null);
  ctx.globalAlpha = 1;
  roundedRect(ctx, tile.x, tile.y, tile.width, tile.height, corner);
  paint(ctx, chosen ? PALETTE.playerLight : hud.card, hud.edge, chosen ? 5 : 2.5);
  if (chosen) {
    ctx.save();
    ctx.setLineDash([9, 7]);
    ellipse(ctx, tile.centerX, tile.centerY, tile.width * 0.39, tile.height * 0.35, null, PALETTE.trafficRed, 3);
    ctx.restore();
    drawSelectionMark(ctx, tile.x + tile.width - 18, tile.y + 18, 13);
  }
  if (!hasVehicle(unlocked, tile.kind)) {
    const shake = nudge?.kind === tile.kind ? Math.max(0, 1 - nudge.progress) * 1.4 : 0;
    drawPresent(ctx, tile.centerX, tile.centerY + 4, Math.min(tile.width * 0.65, tile.height * 0.48), {
      time: time + tile.index * 0.3, wobble: 0.18 + shake,
    });
    return;
  }
  const bounce = chosen ? Math.sin(time * 4) * 4 : 0;
  const scale = chosen ? 1.12 : 1;
  const vehicleWidth = Math.min(64, tile.width * 0.47, (tile.height - 14) / 1.58 / 1.12) * scale;
  drawPlayerVehicle(ctx, tile.centerX, tile.centerY + bounce, vehicleWidth, vehicleWidth * 1.58, {
    kind: tile.kind, color, time, steer: chosen ? Math.sin(time * 2) * 0.2 : 0,
  });
}

function drawColorDots(ctx, width, height, selectedColor, faded) {
  ctx.save();
  ctx.globalAlpha = faded ? FADED_DOTS : 1;
  for (const dot of garageColorDots(width, height)) {
    const chosen = !faded && dot.color === selectedColor;
    if (chosen) ellipse(ctx, dot.centerX, dot.centerY, dot.radius + 7, dot.radius + 7, PALETTE.white, PALETTE.ink, 3);
    ellipse(ctx, dot.centerX, dot.centerY, dot.radius, dot.radius, dot.entry.value, PALETTE.ink, 2.5);
    if (chosen) drawSelectionMark(ctx, dot.centerX, dot.centerY, dot.radius * 0.55);
  }
  ctx.restore();
}

function drawArrowButton(ctx, button) {
  ellipse(ctx, button.centerX, button.centerY + 4, button.radius, button.radius, PALETTE.ink, null);
  ellipse(ctx, button.centerX, button.centerY, button.radius, button.radius, PALETTE.white, PALETTE.ink, 3);
  const direction = button.direction;
  polygon(ctx, [
    [button.centerX + direction * 15, button.centerY],
    [button.centerX - direction * 7, button.centerY - 14],
    [button.centerX - direction * 7, button.centerY + 14]
  ], PALETTE.player, PALETTE.ink, 2);
}

function drawDone(ctx, width, height) {
  const button = garageDoneButton(width, height);
  ellipse(ctx, button.centerX, button.centerY + 5, button.radius, button.radius, PALETTE.ink, null);
  ellipse(ctx, button.centerX, button.centerY, button.radius, button.radius, PALETTE.button, PALETTE.ink, 4);
  polygon(ctx, [
    [button.centerX - button.radius * 0.16, button.centerY - button.radius * 0.33],
    [button.centerX + button.radius * 0.36, button.centerY],
    [button.centerX - button.radius * 0.16, button.centerY + button.radius * 0.33]
  ], PALETTE.white, PALETTE.ink, 2.5);
}

export function drawGarage(ctx, { width, height, kinds, unlocked, selected, color = 'sunshine', time = 0, page = 0, nudge = null }, { ground, hud } = DAY_THEME) {
  ctx.save();
  ctx.fillStyle = ground.sky;
  ctx.fillRect(0, 0, width, height);
  ellipse(ctx, width * 0.06, height * 0.09, width * 0.12, width * 0.12, ground.sun, null);
  ellipse(ctx, width * 0.96, height * 0.7, width * 0.15, width * 0.15, ground.hill, null);
  for (const tile of garageTiles(width, height, kinds, page)) drawGarageTile(ctx, tile, { selected, unlocked, color, time, nudge, hud });
  drawColorDots(ctx, width, height, color, hasFixedColor(selected));
  drawDone(ctx, width, height);
  const pageCount = garagePageCount(width, height, kinds);
  if (pageCount > 1) {
    const current = ((Math.floor(page) % pageCount) + pageCount) % pageCount;
    const buttons = garagePageButtons(width, height);
    drawArrowButton(ctx, buttons.previous);
    drawArrowButton(ctx, buttons.next);
    for (let index = 0; index < pageCount; index += 1) {
      ellipse(ctx, width / 2 + (index - (pageCount - 1) / 2) * 18, height - 7, index === current ? 5 : 3.5, 3.5, index === current ? hud.text : PALETTE.hub, null);
    }
  }
  ctx.restore();
}

function drawSwapArrow(ctx, radius, from, to, lineWidth) {
  ctx.beginPath();
  ctx.arc(0, 0, radius, from, to);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.stroke();
  const tip = [Math.cos(to) * radius, Math.sin(to) * radius];
  const along = [-Math.sin(to), Math.cos(to)];
  const out = [Math.cos(to), Math.sin(to)];
  const head = lineWidth * 1.7;
  polygon(ctx, [
    [tip[0] + along[0] * head, tip[1] + along[1] * head],
    [tip[0] + out[0] * head, tip[1] + out[1] * head],
    [tip[0] - out[0] * head, tip[1] - out[1] * head],
  ], PALETTE.ink, PALETTE.ink, 1);
}

function wiggleButton(ctx, radius, time) {
  const phase = ((time % WIGGLE.every) + WIGGLE.every) % WIGGLE.every;
  if (phase >= WIGGLE.lasts) return;
  const share = phase / WIGGLE.lasts;
  ctx.translate(0, -Math.sin(share * Math.PI) * radius * 0.08);
  ctx.rotate(Math.sin(phase * 14) * 0.18 * (1 - share));
}

export function drawGarageButton(ctx, x, y, size, { kind = 'car', color = 'sunshine', time = 0, wiggle = false } = {}) {
  const radius = size / 2;
  ctx.save();
  ctx.translate(x, y);
  if (wiggle) wiggleButton(ctx, radius, time);
  ellipse(ctx, 0, 4, radius, radius, PALETTE.ink, null);
  ellipse(ctx, 0, 0, radius, radius, PALETTE.player, PALETTE.ink, 3);
  const lineWidth = Math.max(2.5, radius * 0.1);
  drawSwapArrow(ctx, radius * 0.72, Math.PI * 1.12, Math.PI * 1.88, lineWidth);
  drawSwapArrow(ctx, radius * 0.72, Math.PI * 0.12, Math.PI * 0.88, lineWidth);
  const length = radius * 0.94;
  drawPlayerVehicle(ctx, 0, 0, length / 1.58, length, { kind, color });
  ctx.restore();
}
