import { CORNER, box } from "../../../kit/src/canvas/layout.js";
import { PAGE_H, PAGE_W } from "./geometry.js";

export const TILE = 88;
export const BIG = 120;
const PAD = 8;
const GAP = 8;
const STRIDE = TILE + GAP;
const TILE_MOST = 160;

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

const strip = (id, items, area, vertical) => ({ id, items, ...area, vertical });

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
  const scored = arrangements(width, top, bottom, tools, paints).map((one) => ({ ...one, page: fitPage(one.page) }));
  const best = scored.reduce((one, two) => (two.page.scale * two.weight > one.page.scale * one.weight ? two : one));
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

const lengthOf = (one) => (one.vertical ? one.h : one.w);
const contentOf = (one) => Math.max(0, one.items.length * STRIDE - GAP);

export const stripMost = (one) => Math.max(0, contentOf(one) - lengthOf(one));

export function stripTargets(one, scroll) {
  const start = contentOf(one) < lengthOf(one) ? (lengthOf(one) - contentOf(one)) / 2 : -Math.max(0, Math.min(stripMost(one), scroll));
  return one.items.map((item, at) => {
    const along = start + at * STRIDE;
    const area = one.vertical ? box(one.x, one.y + along, TILE, TILE) : box(one.x + along, one.y, TILE, TILE);
    return { ...item, ...area, strip: one.id, visible: along >= -0.5 && along + TILE <= lengthOf(one) + 0.5 };
  });
}

export const snapScroll = (one, scroll) => Math.max(0, Math.min(stripMost(one), Math.round(scroll / STRIDE) * STRIDE));

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
  const picture = fitPage(beside ? box(PAD, top, width - 2 * PAD - BIG - (actions.length ? TILE + GAP : 0) - GAP, bottom - top) : box(PAD, top, width - 2 * PAD, bottom - BIG - GAP - top));
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
