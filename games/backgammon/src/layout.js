export const NOMINAL = 320;
export const POINT_SHARE = 0.43;

const RIM = 3;
const STEP = 1.48;
const layouts = new Map();

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const box = (x, y, w, h) => Object.freeze({ x, y, w, h });

function build(size) {
  const line = Math.max(2, size * 0.007);
  const margin = (line + RIM) / 2 + 0.5;
  const dockHeight = clamp(size * 0.15, 40, 80);
  const gap = Math.max(4, size * 0.014);
  const width = size - 2 * margin;
  const table = box(margin, margin, width, size - 2 * margin - gap - dockHeight);
  const rail = Math.max(6, width * 0.028);
  const trayWidth = width * 0.09;
  const barWidth = width * 0.058;
  const field = box(table.x + rail, table.y + rail, width - 2 * rail - trayWidth, table.h - 2 * rail);
  const pointWidth = (field.w - barWidth) / 12;
  return Object.freeze({
    size,
    line,
    rail,
    table,
    field,
    bar: box(field.x + 6 * pointWidth, field.y, barWidth, field.h),
    tray: box(field.x + field.w, field.y, trayWidth, field.h),
    dock: box(margin, table.y + table.h + gap, width, dockHeight),
    pointWidth,
    radius: Math.min(pointWidth * 0.42, field.h * 0.05),
  });
}

export function layoutFor(size) {
  if (!layouts.has(size)) layouts.set(size, build(size));
  return layouts.get(size);
}

function columnOf(layout, point, mirrored) {
  const shown = mirrored ? 23 - point : point;
  const top = shown >= 12;
  const column = top ? shown - 12 : 11 - shown;
  return { x: layout.field.x + column * layout.pointWidth + (column >= 6 ? layout.bar.w : 0), top };
}

const middleOf = (layout) => layout.field.y + layout.field.h / 2;

function stepFor(layout, count) {
  if (count < 2) return 0;
  const room = layout.field.h / 2 - layout.radius * 2.2;
  return Math.min(layout.radius * STEP, room / (count - 1));
}

export function pointBox(layout, point, { mirrored = false } = {}) {
  const { x, top } = columnOf(layout, point, mirrored);
  const half = layout.field.h / 2;
  return { x, y: top ? layout.field.y : layout.field.y + half, w: layout.pointWidth, h: half };
}

export function stackSpot(layout, point, index, count, { mirrored = false } = {}) {
  const { x, top } = columnOf(layout, point, mirrored);
  const { field, radius } = layout;
  const edge = top ? field.y + radius : field.y + field.h - radius;
  return { x: x + layout.pointWidth / 2, y: edge + (top ? 1 : -1) * index * stepFor(layout, count), r: radius };
}

export function barBox(layout, mine) {
  const { bar, field } = layout;
  return { x: bar.x, y: mine ? middleOf(layout) : field.y, w: bar.w, h: field.h / 2 };
}

export function barSpot(layout, mine, index, count) {
  const away = layout.radius * 1.2 + index * stepFor(layout, count);
  return { x: layout.bar.x + layout.bar.w / 2, y: middleOf(layout) + (mine ? away : -away), r: layout.radius };
}

export function trayBox(layout, mine) {
  const { tray, field } = layout;
  return { x: tray.x, y: mine ? middleOf(layout) : field.y, w: tray.w, h: field.h / 2 };
}

export function traySpot(layout, mine, index, count) {
  const { tray, field } = layout;
  const r = Math.min(tray.w * 0.32, layout.radius);
  const shown = Math.min(count, 5);
  const centre = field.y + field.h * (mine ? 0.72 : 0.28);
  return { x: tray.x + tray.w / 2, y: centre + (Math.min(index, shown - 1) - (shown - 1) / 2) * r * 0.7, r };
}

export function trayCountAt(layout, mine) {
  const { tray, field } = layout;
  const size = clamp(tray.w * 0.7, 20, 30);
  return { x: tray.x + tray.w / 2, y: mine ? field.y + field.h - size * 0.75 : field.y + size * 0.75, size };
}

export function diceSpots(layout, count) {
  const { dock } = layout;
  const pair = Math.min(dock.h * 0.8, dock.w * 0.13);
  const size = count > 2 ? Math.min(pair * 0.84, (dock.w * 0.46) / 4.6) : pair;
  const gap = size * 0.3;
  const first = dock.x + (dock.w - count * size - (count - 1) * gap) / 2 + size / 2;
  return Array.from({ length: count }, (_, at) => ({ x: first + at * (size + gap), y: dock.y + dock.h / 2, size }));
}

export function diceBox(layout) {
  const spots = diceSpots(layout, 4);
  const [first, last] = [spots[0], spots.at(-1)];
  const { dock } = layout;
  return { x: first.x - first.size / 2, y: dock.y, w: last.x + last.size / 2 - (first.x - first.size / 2), h: dock.h };
}

export function pipsAt(layout) {
  const { dock } = layout;
  const size = clamp(dock.h * 0.44, 20, 30);
  const r = clamp(dock.h * 0.2, 7, 15);
  const y = dock.y + dock.h / 2;
  const width = size * 1.9;
  const left = dock.x + r + 1;
  const right = dock.x + dock.w - r - 1;
  return [
    { x: left + r + size * 0.25, y, size, width, align: "left", mark: { x: left, y, r } },
    { x: right - r - size * 0.25, y, size, width, align: "right", mark: { x: right, y, r } },
  ];
}
