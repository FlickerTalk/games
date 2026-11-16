import { CORNER, barLayout, box } from "../../../kit/src/canvas/index.js";
import { BUILD_SIZE, TOOLS } from "./editor.js";

export { CORNER };

const PAD = 8;
const GAP = 8;
const FRAME = 6;
const BUTTON = 88;
const MAIN = 120;
const STRIP_LEAST = 40;
const STRIP_MOST = 150;
const CELL_LEAST = 14;
const SCALES = [1, 0.9, 0.8, 0.75];
const MAINS = ["play", "send"];

const widthOf = (row) => row.reduce((sum, item) => sum + item.size, 0) + GAP * (row.length - 1);
const tallOf = (row) => Math.max(...row.map((item) => item.size));
const heightOf = (rows) => rows.reduce((sum, row) => sum + tallOf(row), 0) + GAP * Math.max(0, rows.length - 1);

function pack(items, width) {
  const rows = [];
  for (const item of items) {
    const row = rows.at(-1);
    if (row && widthOf([...row, item]) <= width) row.push(item);
    else rows.push([item]);
  }
  return rows;
}

function place(rows, { x, y, w }) {
  const targets = [];
  let top = y;
  for (const row of rows) {
    const tall = tallOf(row);
    let left = x + (w - widthOf(row)) / 2;
    for (const item of row) {
      targets.push({ kind: item.kind, value: item.value, x: left, y: top + (tall - item.size) / 2, w: item.size, h: item.size });
      left += item.size + GAP;
    }
    top += tall + GAP;
  }
  return targets;
}

function boardIn(frame, size) {
  const cell = Math.max(0, Math.floor((frame.w - 2 * FRAME) / size));
  const inset = (frame.w - cell * size) / 2;
  return { x: frame.x + inset, y: frame.y + inset, cell, size };
}

function stack(c) {
  const rows = pack(c.items, c.width - 8);
  const block = heightOf(rows);
  const stripTall = c.strip ? (c.height >= 700 ? 100 : 84) : 0;
  const avail = c.bottom - c.top - block - GAP - (c.strip ? stripTall + GAP : 0);
  const span = Math.min(c.width - 2 * PAD, avail);
  const frame = box((c.width - span) / 2, c.top + avail - span, span, span);
  const strip = c.strip ? box(PAD, frame.y + span + GAP, c.width - 2 * PAD, stripTall) : null;
  return { mode: "stack", frame, strip, buttons: place(rows, { x: 0, y: c.bottom - block, w: c.width }) };
}

function side(c, kinds) {
  if (!c.strip) return null;
  const beside = c.items.filter((item) => kinds.includes(item.kind));
  const rows = pack(c.items.filter((item) => !kinds.includes(item.kind)), c.width - 8);
  const stripWide = c.width - 2 * PAD - widthOf(beside) - GAP;
  if (stripWide < 100 || !rows.length) return null;
  const tall = tallOf(beside);
  const avail = c.bottom - c.top - tall - GAP - heightOf(rows) - GAP;
  const span = Math.min(c.width - 2 * PAD, avail);
  const frame = box((c.width - span) / 2, c.top + avail - span, span, span);
  const rowY = frame.y + span + GAP;
  const buttons = [...place([beside], { x: PAD + stripWide + GAP, y: rowY, w: widthOf(beside) }), ...place(rows, { x: 0, y: rowY + tall + GAP, w: c.width })];
  return { mode: "side", frame, strip: box(PAD, rowY, stripWide, tall), buttons };
}

function beside(c, panel) {
  const rows = pack(c.items, panel);
  if (rows.some((row) => widthOf(row) > panel)) return null;
  const avail = c.bottom - c.top;
  const block = heightOf(rows);
  const stripTall = c.strip ? Math.min(STRIP_MOST, avail - block - GAP) : 0;
  const span = Math.min(avail, c.width - 2 * PAD - GAP - panel);
  const left = (c.width - (span + GAP + panel)) / 2;
  const frame = box(left, c.top + (avail - span) / 2, span, span);
  const content = block + (c.strip ? stripTall + GAP : 0);
  const panelY = c.top + (avail - content) / 2;
  const strip = c.strip ? box(left + span + GAP, panelY, panel, stripTall) : null;
  return { mode: "beside", frame, strip, buttons: place(rows, { x: left + span + GAP, y: panelY + (c.strip ? stripTall + GAP : 0), w: panel }) };
}

function compact(c) {
  const main = c.items.find((item) => MAINS.includes(item.kind));
  const panel = 2 * Math.round(BUTTON * c.scale) + GAP;
  const rows = pack(c.items.filter((item) => item !== main), panel);
  const leftWide = c.width - 2 * PAD - GAP - panel;
  const avail = c.bottom - c.top;
  const span = Math.min(leftWide, avail - main.size - GAP);
  if (leftWide < main.size) return null;
  const block = heightOf(rows);
  const frame = box(PAD + (leftWide - span) / 2, c.top, span, span);
  const strip = c.strip ? box(PAD + leftWide + GAP, c.top + block + GAP, panel, Math.min(STRIP_MOST, avail - block - GAP)) : null;
  const buttons = [...place(rows, { x: PAD + leftWide + GAP, y: c.top, w: panel }), ...place([[main]], { x: PAD, y: c.bottom - main.size, w: leftWide })];
  return { mode: "compact", frame, strip, buttons };
}

function fits(found, c) {
  if (!found) return false;
  const areas = [found.frame, ...(found.strip ? [found.strip] : []), ...found.buttons];
  const within = areas.every((area) => area.w >= 0 && area.x >= 0 && area.y >= c.top - 0.5 && area.x + area.w <= c.width + 0.5 && area.y + area.h <= c.bottom + 0.5);
  return within && (!found.strip || (found.strip.h >= STRIP_LEAST && found.strip.w >= 100)) && boardIn(found.frame, c.size).cell >= CELL_LEAST;
}

function arrange(c) {
  const kinds = [...new Set(c.items.map((item) => item.kind))];
  const panels = [...new Set(c.items.map((_, at) => widthOf(c.items.slice(0, at + 1))))].filter((panel) => panel >= MAIN * c.scale);
  const tries = [stack(c), side(c, kinds.filter((kind) => MAINS.includes(kind))), side(c, ["undo", ...MAINS]), ...panels.map((panel) => beside(c, panel)), compact(c)];
  const good = tries.filter((found) => fits(found, c));
  return good.length ? good.reduce((one, two) => (boardIn(two.frame, c.size).cell > boardIn(one.frame, c.size).cell ? two : one)) : null;
}

function layoutFor(width, height, { size, kinds, strip, cells, fill = false, rival = false }) {
  const top = barLayout(width, height, { rival });
  const base = { width, height, size, strip, top: top.bar.y + top.bar.h + top.gap, bottom: height - (fill ? CORNER : PAD) };
  let found = null;
  let scale = 1;
  for (scale of SCALES) {
    const items = kinds.map(([kind, value]) => ({ kind, value, size: Math.round((MAINS.includes(kind) ? MAIN : BUTTON) * scale) }));
    found = arrange({ ...base, items, scale });
    if (found) break;
    if (scale === SCALES.at(-1)) found = stack({ ...base, items, scale });
  }
  return { width, height, fill, cells, scale, ...top, ...found, board: boardIn(found.frame, size) };
}

export function playLayout(width, height, { commands = ["L", "F", "R"], size = 7, fill = false, rival = false } = {}) {
  const kinds = [...commands.map((command) => (command === "ring" ? ["ring", "ring"] : ["command", command])), ["undo", "undo"], ["play", "play"]];
  return layoutFor(width, height, { size, kinds, strip: true, cells: false, fill, rival });
}

export function buildLayout(width, height, { fill = false, rival = false } = {}) {
  const kinds = [...TOOLS.map((tool) => ["tool", tool]), ["send", "send"]];
  return layoutFor(width, height, { size: BUILD_SIZE, kinds, strip: false, cells: true, fill, rival });
}

function cellTargets({ board }) {
  return Array.from({ length: board.size * board.size }, (_, at) => ({ kind: "cell", value: at, x: board.x + (at % board.size) * board.cell, y: board.y + Math.floor(at / board.size) * board.cell, w: board.cell, h: board.cell }));
}

export function layoutTargets(layout, { volume = false } = {}) {
  const { pause, speaker, music } = layout.controls;
  const targets = [...layout.buttons, { kind: "pause", value: "pause", ...pause }, { kind: "speaker", value: "speaker", ...speaker }, { kind: "music", value: "music", ...music }, ...(layout.cells ? cellTargets(layout) : [])];
  return volume ? [{ kind: "volume", value: "volume", ...layout.volume }, ...targets] : targets;
}
