import { CORNER, barLayout, box, target } from "../../../kit/src/canvas/index.js";
import { KINDS, MOST } from "./train.js";

export { CORNER };

const PAD = 8;
const GAP = 8;
const UNIT = 88;
const MAIN = 120;
const CELL_MOST = 120;
const BAND_LEAST = 72;
const BAND_NARROWEST = 180;
const WAGON_MOST = 84;
const ENGINE = 1.5;
const SCALES = [1, 0.9, 0.8, 0.75, 0.7];

export function trainPlace(band, count) {
  const size = Math.max(10, Math.min(WAGON_MOST, (band.w - 16) / (count + ENGINE), band.h * 0.5));
  const total = size * (count + ENGINE);
  const left = band.x + (band.w - total) / 2;
  return {
    size,
    engine: size * 1.4,
    engineX: left + size * ENGINE * 0.5,
    y: band.y + band.h * 0.58,
    xs: Array.from({ length: count }, (_, at) => left + size * (ENGINE + at + 0.5)),
    left,
    right: left + total,
  };
}

function frameOf(width, height, { fill, rival }) {
  const top = barLayout(width, height, { rival });
  const from = top.bar.y + top.bar.h + top.gap;
  const bottom = height - (fill ? CORNER : PAD);
  return { top, from, bottom, avail: bottom - from };
}

function sidingAt(width, { from, bottom, avail }, choices, scale) {
  const unit = Math.round(UNIT * scale);
  const across = Math.min(choices, Math.floor(width / unit));
  if (across < 1) return null;
  const rows = Math.ceil(choices / across);
  const columns = Math.ceil(choices / rows);
  const cell = rows > 1 ? unit : Math.floor(Math.min(width / columns, CELL_MOST, Math.max(unit, avail * 0.3)));
  const tall = rows * cell;
  const left = (width - columns * cell) / 2;
  const y = bottom - tall;
  const cells = Array.from({ length: choices }, (_, at) => target("candidate", at, box(left + (at % columns) * cell, y + Math.floor(at / columns) * cell, cell, cell)));
  return { cells, siding: box(left, y, columns * cell, tall), band: box(0, from, width, y - GAP - from) };
}

export function playLayout(width, height, { count = 4, choices = 3, fill = false, rival = false } = {}) {
  const frame = frameOf(width, height, { fill, rival });
  let found = null;
  let scale = 1;
  for (scale of SCALES) {
    found = sidingAt(width, frame, choices, scale) ?? found;
    if (found && found.band.h >= BAND_LEAST) break;
  }
  return { width, height, fill, scale, ...frame.top, ...found, buttons: found.cells, slots: [], train: trainPlace(found.band, count) };
}

const paletteAt = (left, top, unit, columns) => Array.from({ length: KINDS }, (_, kind) => target("wagon", kind, box(left + (kind % columns) * unit, top + Math.floor(kind / columns) * unit, unit, unit)));

function stacked({ width, from, bottom }, unit, main) {
  if (4 * unit > width) return null;
  const rowTop = bottom - main;
  const paletteTop = rowTop - GAP - 2 * unit;
  const left = (width - (2 * unit + main + 2 * GAP)) / 2;
  const small = rowTop + (main - unit) / 2;
  return {
    band: box(0, from, width, paletteTop - GAP - from),
    buttons: [
      ...paletteAt((width - 4 * unit) / 2, paletteTop, unit, 4),
      target("undo", "undo", box(left, small, unit, unit)),
      target("dots", "dots", box(left + unit + GAP, small, unit, unit)),
      target("send", "send", box(left + 2 * (unit + GAP), rowTop, main, main)),
    ],
  };
}

function inOneRow({ width, from, bottom, avail }, unit, main) {
  const tall = avail - unit - GAP;
  const group = 2 * unit + main + 2 * GAP;
  if (KINDS * unit > width || tall < main) return null;
  const left = width - PAD - group;
  const middle = from + tall / 2;
  return {
    band: box(PAD, from, left - GAP - PAD, tall),
    buttons: [
      ...paletteAt((width - KINDS * unit) / 2, bottom - unit, unit, KINDS),
      target("undo", "undo", box(left, middle - unit / 2, unit, unit)),
      target("dots", "dots", box(left + unit + GAP, middle - unit / 2, unit, unit)),
      target("send", "send", box(left + 2 * (unit + GAP), middle - main / 2, main, main)),
    ],
  };
}

function cornered({ width, from, bottom, avail }, unit, main) {
  const tall = avail - 2 * unit - GAP;
  const gap = Math.min(GAP, width - 5 * unit);
  if (gap < 0 || tall < main) return null;
  const left = (width - (5 * unit + gap)) / 2;
  const top = bottom - 2 * unit;
  return {
    band: box(PAD, from, width - 2 * PAD - main - GAP, tall),
    buttons: [
      ...paletteAt(left, top, unit, 4),
      target("undo", "undo", box(left + 4 * unit + gap, top, unit, unit)),
      target("dots", "dots", box(left + 4 * unit + gap, top + unit, unit, unit)),
      target("send", "send", box(width - PAD - main, from + (tall - main) / 2, main, main)),
    ],
  };
}

const roomy = (found) => Boolean(found) && found.band.h >= BAND_LEAST && found.band.w >= BAND_NARROWEST;

function slotsOf(band, train) {
  return train.xs.map((x, at) => target("slot", at, box(x - train.size / 2, band.y, train.size, band.h)));
}

export function composeLayout(width, height, { fill = false, rival = false, gaps = false, count = MOST } = {}) {
  const frame = { width, ...frameOf(width, height, { fill, rival }) };
  const sized = (found) => trainPlace(found.band, count).size;
  let found = null;
  let scale = 1;
  for (scale of SCALES) {
    const [unit, main] = [Math.round(UNIT * scale), Math.round(MAIN * scale)];
    const good = [stacked(frame, unit, main), inOneRow(frame, unit, main), cornered(frame, unit, main)].filter(roomy);
    if (good.length) found = good.reduce((one, two) => (sized(two) > sized(one) ? two : one));
    if (found) break;
  }
  found ??= stacked(frame, Math.round(UNIT * scale), Math.round(MAIN * scale));
  const train = trainPlace(found.band, count);
  return { width, height, fill, scale, ...frame.top, ...found, cells: [], slots: gaps ? slotsOf(found.band, train) : [], train };
}

export function layoutTargets(layout, { volume = false } = {}) {
  const { pause, speaker, music } = layout.controls;
  const targets = [...layout.buttons, target("pause", "pause", pause), target("speaker", "speaker", speaker), target("music", "music", music), ...layout.slots];
  return volume ? [target("volume", "volume", layout.volume), ...targets] : targets;
}
