import { CORNER, barLayout, box, target } from "../../../kit/src/canvas/index.js";
import { FINISH } from "./rules.js";

const PAD = 8;
const DIE = 120;
const DIE_NARROW = 96;
const DIE_GAP = 12;
const NARROW = 420;
const CELL_MOST = 96;
const CELL_ROOMY = 44;
const COLUMN_GAP = 0.14;
const ROW_GAPS = [0.5, 0.3];
const COLUMNS = [5, 6, 10, 15];

function fitted(region, count, cols, rowGap) {
  const rows = Math.ceil(count / cols);
  const cell = Math.min(CELL_MOST, region.w / (cols + (cols - 1) * COLUMN_GAP), region.h / (rows + (rows - 1) * rowGap));
  return { cols, rows, cell, rowGap };
}

export function trackIn(region, count = FINISH) {
  const best = (rowGap) => COLUMNS.map((cols) => fitted(region, count, cols, rowGap)).reduce((one, two) => (two.cell > one.cell + 0.01 ? two : one));
  const roomy = best(ROW_GAPS[0]);
  const { cols, rows, cell, rowGap } = roomy.cell >= CELL_ROOMY ? roomy : best(ROW_GAPS[1]);
  const size = Math.max(0, cell);
  const w = cols * size + (cols - 1) * size * COLUMN_GAP;
  const h = rows * size + (rows - 1) * size * rowGap;
  return { count, cols, rows, cell: size, gap: size * COLUMN_GAP, rowGap: size * rowGap, x: region.x + (region.w - w) / 2, y: region.y + (region.h - h) / 2, w, h };
}

export function squareAt(track, square) {
  const index = Math.min(track.count, Math.max(1, square)) - 1;
  const row = Math.floor(index / track.cols);
  const col = index % track.cols;
  return { x: track.x + col * (track.cell + track.gap) + track.cell / 2, y: track.y + row * (track.cell + track.rowGap) + track.cell / 2, row, col };
}

function under(width, top, bottom) {
  const left = (width - 2 * DIE - DIE_GAP) / 2;
  const dice = [0, 1].map((at) => box(left + at * (DIE + DIE_GAP), bottom - DIE, DIE, DIE));
  return { side: false, dice, region: box(PAD, top, width - 2 * PAD, bottom - DIE - PAD - top) };
}

function beside(width, height, top, bottom, fill) {
  const size = width < NARROW ? DIE_NARROW : DIE;
  const tall = 2 * size + DIE_GAP;
  const y = top + Math.max(0, (bottom - top - tall) / 2);
  const inCorner = fill && y + tall > height - CORNER;
  const x = width - PAD - size - (inCorner ? CORNER - PAD : 0);
  const dice = [0, 1].map((at) => box(x, y + at * (size + DIE_GAP), size, size));
  return { side: true, dice, region: box(PAD, top, x - 2 * PAD, bottom - top) };
}

export function playLayout(width, height, { fill = false } = {}) {
  const bar = barLayout(width, height, { rival: true });
  const top = bar.bar.y + bar.bar.h + PAD;
  const bottom = height - (fill ? 2 * PAD : PAD);
  const tried = [under(width, top, bottom), beside(width, height, top, bottom, fill)].map((one) => ({ ...one, track: trackIn(one.region) }));
  const { side, dice, track } = tried[1].track.cell > tried[0].track.cell + 0.01 ? tried[1] : tried[0];
  return { ...bar, width, height, side, track, dice: dice.map((area, at) => target("die", at, area)) };
}

export function layoutTargets(layout, { volume = false, dice = true } = {}) {
  const { controls } = layout;
  return [
    ...(volume ? [target("volume", "volume", layout.volume)] : []),
    target("pause", "pause", controls.pause),
    target("speaker", "speaker", controls.speaker),
    target("music", "music", controls.music),
    ...(dice ? layout.dice : []),
  ];
}
