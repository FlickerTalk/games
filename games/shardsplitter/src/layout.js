import { barLayout } from "../../../kit/src/canvas/bar.js";
import { CORNER, box } from "../../../kit/src/canvas/layout.js";

export { CORNER };

const PAD = 8;
const GAP = 8;
const BUTTON = 88;
const BUTTON_MOST = 132;
const BUTTON_SMALL = 66;
const STAGE_WANTED = 210;
const ROOMY = 260;
const CHIP = 40;
const CHIP_GAP = 4;
const PIECE_MOST = 150;

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const rowWidth = (count, size, gap) => count * size + Math.max(0, count - 1) * gap;

function buttonRow(width, height, top, { mine, fill }) {
  const count = mine.length;
  const wanted = Math.min(BUTTON_MOST, Math.floor((width - 2 * PAD - (count - 1) * GAP) / count));
  const reaches = (size) => (width - rowWidth(count, size, GAP)) / 2 < CORNER;
  const least = fill || height >= 500 ? BUTTON : BUTTON_SMALL;
  const bottomFor = (size) => height - (fill && reaches(size) ? CORNER : PAD);
  let size = wanted;
  for (let turn = 0; turn < 3; turn += 1) size = clamp(Math.min(wanted, bottomFor(size) - top - GAP - STAGE_WANTED), Math.min(least, wanted), BUTTON_MOST);
  const bottom = bottomFor(size);
  const left = (width - rowWidth(count, size, GAP)) / 2;
  return { size, top: bottom - size, buttons: mine.map((divisor, at) => ({ kind: "hit", value: divisor, x: left + at * (size + GAP), y: bottom - size, w: size, h: size })) };
}

function chipRow(theirs, right, y) {
  const left = right - rowWidth(theirs.length, CHIP, CHIP_GAP);
  return theirs.map((divisor, at) => ({ value: divisor, x: left + at * (CHIP + CHIP_GAP), y, w: CHIP, h: CHIP }));
}

function people(width, stage, ground, theirs) {
  const size = clamp(stage.h * 0.52, 64, Math.min(170, width * 0.3));
  const column = size * 0.66;
  const tall = ground - stage.y - 4;
  const roomy = theirs.length > 0 && stage.h >= ROOMY;
  const beside = roomy ? Math.max(column, rowWidth(theirs.length, CHIP, CHIP_GAP)) + GAP / 2 : 0;
  const open = width - 2 * PAD - column - GAP / 2 - beside;
  const wide = Math.min(open, Math.max(300, tall * 1.7));
  const start = PAD + (open - wide) / 2;
  const hero = { x: start + column / 2, y: ground - size * 0.52, size };
  const left = start + column + GAP / 2;
  const right = left + wide + beside;
  if (!theirs.length) return { hero, mate: null, chips: [], seat: null, field: box(left, stage.y + 4, wide, tall) };
  if (!roomy) {
    const chips = chipRow(theirs, width - PAD, stage.y + 2);
    const seat = { x: chips[0].x - CHIP_GAP - CHIP / 2, y: stage.y + 2 + CHIP / 2, size: CHIP };
    const top = stage.y + CHIP + 6;
    return { hero, mate: null, chips, seat, field: box(left, top, wide, ground - top) };
  }
  const mate = { x: right - (beside - GAP / 2) / 2, y: hero.y, size };
  const chips = chipRow(theirs, right, Math.max(stage.y + 2, mate.y - size * 0.72 - CHIP - 4));
  return { hero, mate, chips, seat: null, field: box(left, stage.y + 4, wide, tall) };
}

function barParts(top) {
  const { bar, row, controls, rival } = top;
  const size = row - 14;
  const jar = { x: bar.x + 12 + size / 2, y: bar.y + row / 2, size };
  const start = jar.x + size / 2 + 14;
  if (bar.h > row) return { jar, dots: { x: start, y: bar.y + row / 2, w: Math.max(0, Math.min(190, controls.pause.x - 12 - start)) } };
  const end = rival ? rival.x - rival.size / 2 - 12 : controls.pause.x - 12;
  return { jar, dots: { x: start, y: bar.y + row / 2, w: Math.max(0, Math.min(190, end - start)) } };
}

export function playLayout(width, height, { mine = [2, 5, 10], theirs = [], fill = false, rival = false } = {}) {
  const top = barLayout(width, height, { rival });
  const stageTop = top.bar.y + top.bar.h + top.gap;
  const row = buttonRow(width, height, stageTop, { mine, fill });
  const stage = box(0, stageTop, width, row.top - GAP - stageTop);
  const ground = stage.y + stage.h - Math.max(10, stage.h * 0.1);
  return { width, height, fill, scale: Math.min(1, row.size / BUTTON), ...top, ...barParts(top), buttons: row.buttons, stage, ground, ...people(width, stage, ground, theirs) };
}

export function layoutTargets(layout, { volume = false } = {}) {
  const { pause, speaker, music } = layout.controls;
  const targets = [...layout.buttons, { kind: "pause", value: "pause", ...pause }, { kind: "speaker", value: "speaker", ...speaker }, { kind: "music", value: "music", ...music }];
  return volume ? [{ kind: "volume", value: "volume", ...layout.volume }, ...targets] : targets;
}

function gridFor(field, count) {
  let best = { size: 0, columns: 1 };
  for (let columns = 1; columns <= count; columns += 1) {
    const rows = Math.ceil(count / columns);
    const size = Math.min(field.w / columns, field.h / rows);
    if (size > best.size + 0.01) best = { size, columns };
  }
  return best;
}

export function piecePlaces(field, count) {
  if (count < 1) return [];
  const grid = gridFor(field, count);
  const size = Math.min(grid.size, count === 1 ? Math.min(PIECE_MOST, field.w * 0.9) : PIECE_MOST * 0.8);
  const bottom = field.y + field.h;
  return Array.from({ length: count }, (_, at) => {
    const row = Math.floor(at / grid.columns);
    const inRow = Math.min(grid.columns, count - row * grid.columns);
    const left = field.x + (field.w - inRow * size) / 2;
    return { x: left + ((at % grid.columns) + 0.5) * size, y: bottom - (row + 0.5) * size, size };
  });
}
