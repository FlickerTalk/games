import { CORNER, box } from "../../../kit/src/canvas/layout.js";
import { PAGE_H, PAGE_W } from "./geometry.js";

export const TILE = 88;
export const BIG = 120;
const PAD = 8;
const GAP = 8;
const STRIDE = TILE + GAP;
const TILE_MOST = 160;
export const FRAME = 10;
const PAGE_GIVES = 0.12;

const rowOf = (height) => (height < 420 ? 48 : 56);
const bottomOf = (height, fill) => height - (fill ? CORNER : PAD);

function barButtons(width, row, left, right = ["speaker", "music"]) {
  const lefts = left.map((kind, at) => ({ kind, value: kind, ...box(PAD + at * row, PAD, row, row) }));
  const rights = right.map((kind, at) => ({ kind, value: kind, ...box(width - PAD - (right.length - at) * row, PAD, row, row) }));
  return [...lefts, ...rights];
}

function fitPage(area) {
  const scale = Math.max(0, Math.min(area.w / PAGE_W, area.h / PAGE_H));
  const w = PAGE_W * scale;
  const h = PAGE_H * scale;
  return { x: area.x + (area.w - w) / 2, y: area.y + (area.h - h) / 2, w, h, scale };
}

const strip = (id, items, area, vertical) => ({ id, items, ...area, vertical, lanes: 1, stride: STRIDE });

function arrangements(width, top, bottom, tools, paints) {
  const wide = width - 2 * PAD;
  const tall = bottom - top;
  const found = [];
  const both = [...tools, ...paints];
  if (tools.length) {
    const low = bottom - TILE;
    found.push({ weight: 1, page: box(PAD, top, wide, low - 2 * GAP - TILE - top), strips: [strip("tools", tools, box(PAD, low - GAP - TILE, wide, TILE), false), strip("paints", paints, box(PAD, low, wide, TILE), false)] });
    found.push({ weight: 1, page: box(PAD, top, wide - STRIDE, low - GAP - top), strips: [strip("tools", tools, box(width - PAD - TILE, top, TILE, low - GAP - top), true), strip("paints", paints, box(PAD, low, wide, TILE), false)] });
    found.push({ weight: 1, page: box(PAD, top, wide - 2 * STRIDE, tall), strips: [strip("tools", tools, box(width - PAD - 2 * TILE - GAP, top, TILE, tall), true), strip("paints", paints, box(width - PAD - TILE, top, TILE, tall), true)] });
  }
  const weight = tools.length ? 0.75 : 1;
  found.push({ weight, page: box(PAD, top, wide, tall - STRIDE), strips: [strip("paints", both, box(PAD, bottom - TILE, wide, TILE), false)] });
  found.push({ weight, page: box(PAD, top, wide - STRIDE, tall), strips: [strip("paints", both, box(width - PAD - TILE, top, TILE, tall), true)] });
  return found;
}

const lengthOf = (one) => (one.vertical ? one.h : one.w);
const wholeIn = (length) => Math.max(1, Math.floor((length + GAP) / STRIDE));
const columnsOf = (one) => Math.ceil(one.items.length / one.lanes);

function paced(one) {
  const length = lengthOf(one);
  if (columnsOf(one) <= wholeIn(length)) return one;
  const whole = Math.max(1, Math.floor((length - TILE / 2) / STRIDE));
  return { ...one, stride: Math.max(STRIDE, (length - TILE / 2) / whole) };
}

function widen(found) {
  const paints = found.strips.find((one) => one.id === "paints");
  const upright = paints.vertical;
  const spare = upright ? found.area.w - found.page.w : found.area.h - found.page.h;
  const given = (upright ? found.page.w : found.page.h) * PAGE_GIVES;
  const needed = Math.ceil(paints.items.length / wholeIn(lengthOf(paints)));
  const grow = Math.max(0, Math.min(needed - 1, Math.floor((spare + given) / STRIDE))) * STRIDE;
  const strips = found.strips.map((one) => {
    if (one === paints) return upright ? { ...one, x: one.x - grow, w: one.w + grow, lanes: grow / STRIDE + 1 } : { ...one, y: one.y - grow, h: one.h + grow, lanes: grow / STRIDE + 1 };
    if (one.vertical === upright) return upright ? { ...one, x: one.x - grow } : { ...one, y: one.y - grow };
    return { ...one, h: one.h - grow };
  });
  const area = upright ? { ...found.area, w: found.area.w - grow } : { ...found.area, h: found.area.h - grow };
  return { ...found, page: fitPage(area), strips: strips.map(paced) };
}

function portraits(width, row, left) {
  const size = Math.min(48, row - 8);
  const middle = (PAD + left.length * row + width - PAD - 2 * row) / 2;
  const me = { x: middle - row / 2 - 4, y: PAD + row / 2, size };
  const rival = { x: middle + row / 2 + 4, y: PAD + row / 2, size };
  return { me, rival, target: { kind: "rival", value: "rival", ...box(rival.x - row / 2, PAD, row, row) } };
}

export function screenLayout(width, height, { fill = false, left = ["back"], rival = false, tools = [], paints = [] } = {}) {
  const row = rowOf(height);
  const top = PAD + row + GAP;
  const bottom = bottomOf(height, fill);
  const scored = arrangements(width, top, bottom, tools, paints).map((one) => ({ ...one, area: one.page, page: fitPage(one.page) }));
  const best = widen(scored.reduce((one, two) => (two.page.scale * two.weight > one.page.scale * one.weight ? two : one)));
  const faces = rival ? portraits(width, row, left) : null;
  const buttons = [...barButtons(width, row, left), ...(faces ? [faces.target] : [])];
  const speaker = buttons.find((one) => one.kind === "speaker");
  const volume = box(Math.max(PAD, Math.min(width - PAD - 240, speaker.x + speaker.w / 2 - 120)), PAD + row + 6, 240, 64);
  return { width, height, fill, row, buttons, portraits: faces && { me: faces.me, rival: faces.rival }, page: best.page, strips: best.strips, volume };
}

export function soundLine(width, height) {
  const size = rowOf(height);
  const speaker = width - PAD - 2 * size;
  return box(Math.max(PAD, Math.min(width - PAD - 240, speaker + size / 2 - 120)), PAD + size + 6, 240, 64);
}

const contentOf = (one) => Math.max(0, (columnsOf(one) - 1) * one.stride + TILE);

export const stripMost = (one) => Math.max(0, contentOf(one) - lengthOf(one));

export function stripTargets(one, scroll) {
  const start = contentOf(one) < lengthOf(one) ? (lengthOf(one) - contentOf(one)) / 2 : -Math.max(0, Math.min(stripMost(one), scroll));
  const edge = ((one.vertical ? one.w : one.h) - (one.lanes * STRIDE - GAP)) / 2;
  return one.items.map((item, at) => {
    const along = start + Math.floor(at / one.lanes) * one.stride;
    const across = edge + (at % one.lanes) * STRIDE;
    const area = one.vertical ? box(one.x + across, one.y + along, TILE, TILE) : box(one.x + along, one.y + across, TILE, TILE);
    return { ...item, ...area, strip: one.id, visible: along >= -0.5 && along + TILE <= lengthOf(one) + 0.5 };
  });
}

export const snapScroll = (one, scroll) => Math.max(0, Math.min(stripMost(one), Math.round(scroll / one.stride) * one.stride));

function gridShape(area, count, aspect) {
  let best = null;
  for (let columns = 1; columns <= 8; columns += 1) {
    const w = Math.min(TILE_MOST, Math.floor((area.w - (columns - 1) * GAP) / columns));
    const h = Math.round(w * aspect);
    const rows = Math.floor((area.h + GAP) / (h + GAP));
    if (w < TILE || rows < 1) continue;
    const score = w * Math.sqrt(Math.min(columns * rows, count));
    if (!best || score > best.score) best = { columns, rows, w, h, score };
  }
  return best ?? { columns: 1, rows: 1, w: TILE, h: Math.max(TILE, Math.round(TILE * aspect)) };
}

export function gridLayout(width, height, { fill = false, count = 0, page = 0, aspect = 1.2 } = {}) {
  const row = rowOf(height);
  const top = PAD + row + GAP;
  const area = box(PAD, top, width - 2 * PAD, bottomOf(height, fill) - top);
  const shape = gridShape(area, count, aspect);
  const perPage = shape.columns * shape.rows;
  const pages = Math.max(1, Math.ceil(count / perPage));
  const shown = Math.max(0, Math.min(pages - 1, page));
  const used = Math.min(perPage, count - shown * perPage);
  const columns = Math.min(shape.columns, Math.max(1, used));
  const rows = Math.ceil(used / columns);
  const left = area.x + (area.w - (columns * (shape.w + GAP) - GAP)) / 2;
  const first = area.y + Math.max(0, (area.h - (rows * (shape.h + GAP) - GAP)) / 2);
  const tiles = Array.from({ length: used }, (_, at) => ({ kind: "tile", value: shown * perPage + at, ...box(left + (at % columns) * (shape.w + GAP), first + Math.floor(at / columns) * (shape.h + GAP), shape.w, shape.h) }));
  const paging = [...(shown > 0 ? ["prev"] : []), ...(shown < pages - 1 ? ["next"] : [])];
  const buttons = barButtons(width, row, ["back"], [...paging, "speaker", "music"]);
  return { width, height, fill, row, page: shown, pages, perPage, tiles, buttons };
}

export function pictureLayout(width, height, { fill = false, actions = [], gift = false } = {}) {
  const row = rowOf(height);
  const top = PAD + row + GAP;
  const bottom = bottomOf(height, fill);
  const beside = width > height * 1.1;
  const room = beside ? box(PAD, top, width - 2 * PAD - BIG - (actions.length ? TILE + GAP : 0) - GAP, bottom - top) : box(PAD, top, width - 2 * PAD, bottom - BIG - GAP - top);
  const picture = fitPage(box(room.x + FRAME, room.y + FRAME, room.w - 2 * FRAME, room.h - 2 * FRAME));
  const buttons = barButtons(width, row, ["home"]);
  const add = (kind, area) => buttons.push({ kind, value: kind, ...area });
  if (beside) {
    const playX = width - PAD - BIG;
    add("play", box(playX, top + (bottom - top - BIG) / 2, BIG, BIG));
    const stack = actions.length * STRIDE - GAP;
    actions.forEach((kind, at) => add(kind, box(playX - GAP - TILE, top + (bottom - top - stack) / 2 + at * STRIDE, TILE, TILE)));
  } else {
    const across = actions.length * STRIDE + BIG;
    let x = (width - across) / 2;
    for (const kind of actions) {
      add(kind, box(x, bottom - BIG + (BIG - TILE) / 2, TILE, TILE));
      x += STRIDE;
    }
    add("play", box(x, bottom - BIG, BIG, BIG));
  }
  if (gift) add("gift", box(picture.x + Math.max(0, picture.w - TILE - 4), picture.y + 4, TILE, TILE));
  return { width, height, fill, row, picture, buttons, volume: box(Math.max(PAD, width - PAD - 240), PAD + row + 6, 240, 64) };
}
