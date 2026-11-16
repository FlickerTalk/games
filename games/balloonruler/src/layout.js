import { barLayout } from "../../../kit/src/canvas/bar.js";
import { CORNER, box, target } from "../../../kit/src/canvas/layout.js";

const PAD = 12;
const INSET = 8;
const WIDE_FROM = 700;
const TALL_FROM = 420;
const RULER_MOST = 760;
const SLICE = 88;
const STAR = 28;
const SIZES = [0.72, 0.86, 1];

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

function tall(width, top, bottom, flick) {
  const room = bottom - top;
  const cardWidth = Math.min(132, width * 0.34);
  const card = box((width - cardWidth) / 2, top + 10, cardWidth, clamp(room * 0.17, 64, 116));
  const rulerWidth = Math.min(width * 0.9, RULER_MOST);
  const ruler = box((width - rulerWidth) / 2, Math.round(top + room * 0.58), rulerWidth, clamp(room * 0.1, 56, 82));
  const size = clamp(bottom - (ruler.y + ruler.h) - 44, 56, 150);
  const feet = bottom - 4;
  return {
    mode: "tall", card, ruler,
    zone: { top: card.y + card.h + 8 + STAR + 6, bottom: ruler.y },
    archer: { x: ruler.x + ruler.w * 0.2, y: feet, size, flip: false },
    flick: flick ? { x: ruler.x + ruler.w * 0.8, y: feet, size, flip: true } : null,
    stars: { x: width / 2, y: card.y + card.h + 8 + STAR / 2, size: STAR },
    touchBottom: ruler.y + ruler.h + 24,
  };
}

function compact(width, height, top) {
  const room = height - CORNER - top;
  const side = clamp(room * 0.26, 56, 96);
  const rulerHeight = clamp(room * 0.14, 44, 60);
  const ruler = box(width * 0.05, height - CORNER - rulerHeight, width * 0.9, rulerHeight);
  return {
    mode: "compact", ruler,
    card: box(PAD, top + 2, side * 1.15, side),
    zone: { top: top + side + 8, bottom: ruler.y },
    archer: { x: width - PAD - side * 0.45, y: top + 2 + side, size: side, flip: true },
    flick: null,
    stars: { x: width / 2, y: top + 2 + side / 2, size: clamp(side * 0.34, 24, 36) },
    touchBottom: ruler.y + ruler.h,
  };
}

function wide(width, height, top) {
  const bottom = height - CORNER;
  const room = bottom - top;
  const column = clamp(room * 0.5, 90, 170);
  const rulerWidth = Math.min(RULER_MOST, width - 2 * (column + 2 * PAD));
  const rulerHeight = clamp(room * 0.2, 48, 82);
  const ruler = box((width - rulerWidth) / 2, bottom - rulerHeight, rulerWidth, rulerHeight);
  const cardHeight = Math.min(column * 0.88, 116);
  const size = Math.min(150, room - 48, column * 1.3);
  const archerX = ruler.x + ruler.w + PAD + column / 2;
  return {
    mode: "wide", ruler,
    card: box(ruler.x - PAD - column, top + (room - cardHeight) / 2, column, cardHeight),
    zone: { top: top + 4, bottom: ruler.y },
    archer: { x: archerX, y: bottom, size, flip: true },
    flick: null,
    stars: { x: archerX, y: bottom - size - 22, size: clamp(column * 0.3, 24, 30) },
    touchBottom: bottom,
  };
}

export function playLayout(width, height, { fill = false, rival = false, flick = false } = {}) {
  const top = barLayout(width, height, { rival });
  const start = top.bar.y + top.bar.h + top.gap;
  const bottom = height - PAD;
  const arranged = width >= WIDE_FROM ? wide(width, height, start) : bottom - start >= TALL_FROM ? tall(width, start, bottom, flick) : compact(width, height, start);
  const { zone, ruler, touchBottom, ...rest } = arranged;
  return {
    width, height, fill, ...top, ...rest, zone, ruler,
    unit: clamp((zone.bottom - zone.top) * 0.42, 34, 66),
    thread: ruler.y + ruler.h + 16,
    timer: box(top.bar.x + 14, top.bar.y + top.bar.h + 3, top.bar.w - 28, 4),
    touch: box(0, zone.top, width, touchBottom - zone.top),
    slices: clamp(Math.floor(width / SLICE), 1, 10),
  };
}

export const rulerX = (layout, share) => layout.ruler.x + INSET + clamp(share, 0, 1) * (layout.ruler.w - 2 * INSET);

export const shareAt = (layout, x) => clamp((x - layout.ruler.x - INSET) / (layout.ruler.w - 2 * INSET), 0, 1);

export function balloonAt(layout, { share, size, lift }) {
  const { unit, zone } = layout;
  const width = unit * (SIZES[size] ?? 1);
  const string = unit * 0.3;
  const free = Math.max(0, zone.bottom - zone.top - unit * 1.25 - string - 4);
  return { x: rulerX(layout, share), y: zone.bottom - string - width * 0.69 - lift * free, size: width };
}

export function playTargets(layout, { volume = false } = {}) {
  const { pause, speaker, music } = layout.controls;
  const { touch, slices } = layout;
  const each = touch.w / slices;
  const parts = Array.from({ length: slices }, (_, at) => target("ruler", at, box(touch.x + at * each, touch.y, each, touch.h)));
  const targets = [...parts, target("pause", "pause", pause), target("speaker", "speaker", speaker), target("music", "music", music)];
  return volume ? [target("volume", "volume", layout.volume), ...targets] : targets;
}

export function stageLayout(area) {
  const height = clamp(area.h * 0.22, 26, 64);
  const width = Math.min(area.w * 0.86, 520);
  const ruler = box(area.x + (area.w - width) / 2, area.y + area.h - height - Math.min(18, area.h * 0.1), width, height);
  const zone = { top: area.y + 4, bottom: ruler.y };
  return { ruler, zone, unit: clamp((zone.bottom - zone.top) * 0.5, 20, 60) };
}
