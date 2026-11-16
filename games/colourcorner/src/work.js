import { PAGE_H, PAGE_W, required } from "./geometry.js";
import { isPaint } from "./paints.js";
import { PAINT_KEYS } from "./theme.js";

export const STAMPS = Object.freeze(["star", "heart", "flower", "leaf", "paw", "car"]);
export const WIDTHS = Object.freeze([7, 16, 30]);
export const PAPER_KINDS = Object.freeze(["light", "cream", "dark"]);
export const STAMP_SIZE = 44;
export const MAX_POINTS = 6000;

const GAP = 3;

export const blankWork = () => ({ fills: {}, items: [] });

export const blankDrawing = (paper) => ({ paper: PAPER_KINDS.includes(paper) ? paper : PAPER_KINDS[0], items: [] });

export const fillZone = (work, zone, token) => ({ ...work, fills: { ...work.fills, [zone]: token } });

export function clearZone(work, zone) {
  const fills = { ...work.fills };
  delete fills[zone];
  return { ...work, fills };
}

export const isFinished = (page, work) => required(page).every((zone) => work.fills[zone] !== undefined);

const pointsOf = (item) => (item.k === "l" ? item.pts.length / 2 : 1);

export const pointsIn = (work) => work.items.reduce((sum, item) => sum + pointsOf(item), 0);

export function addItem(work, item) {
  if (pointsIn(work) + pointsOf(item) > MAX_POINTS) return work;
  return { ...work, items: [...work.items, item] };
}

export function simplify(points) {
  const kept = [];
  let last = null;
  for (const [x, y] of points) {
    const at = [Math.round(x), Math.round(y)];
    if (last && Math.hypot(at[0] - last[0], at[1] - last[1]) < GAP) continue;
    kept.push(...at);
    last = at;
  }
  if (kept.length === 2) kept.push(kept[0], kept[1]);
  return kept;
}

function nearSegment(x, y, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / length)) : 0;
  return Math.hypot(x - ax - t * dx, y - ay - t * dy);
}

function touches(item, x, y, radius) {
  const xs = item.m ? [x, PAGE_W - x] : [x];
  if (item.k === "s") return xs.some((one) => Math.hypot(one - item.x, y - item.y) <= radius + STAMP_SIZE / 2);
  const reach = radius + WIDTHS[item.w] / 2;
  const { pts } = item;
  return xs.some((one) => {
    for (let at = 0; at + 3 < pts.length; at += 2) if (nearSegment(one, y, pts[at], pts[at + 1], pts[at + 2], pts[at + 3]) <= reach) return true;
    return pts.length === 2 && Math.hypot(one - pts[0], y - pts[1]) <= reach;
  });
}

export function eraseAt(work, x, y, radius) {
  const items = work.items.filter((item) => !touches(item, x, y, radius));
  return items.length === work.items.length ? work : { ...work, items };
}

const isColour = (value) => Number.isInteger(value) && value >= 0 && value < PAINT_KEYS.length;
const isFlag = (value) => value === 0 || value === 1;
const inX = (value) => Number.isInteger(value) && value >= 0 && value <= PAGE_W;
const inY = (value) => Number.isInteger(value) && value >= 0 && value <= PAGE_H;

function isLine(item) {
  const { pts } = item;
  if (!Array.isArray(pts) || pts.length < 2 || pts.length % 2) return false;
  return isColour(item.p) && WIDTHS[item.w] !== undefined && isFlag(item.m) && pts.every((value, at) => (at % 2 ? inY(value) : inX(value)));
}

function itemOf(item) {
  if (!item || typeof item !== "object") return null;
  if (item.k === "l" && isLine(item)) return { k: "l", p: item.p, w: item.w, m: item.m, pts: [...item.pts] };
  const stamp = item.k === "s" && STAMPS[item.t] !== undefined && isColour(item.p) && isFlag(item.m) && inX(item.x) && inY(item.y);
  return stamp ? { k: "s", t: item.t, p: item.p, x: item.x, y: item.y, m: item.m } : null;
}

function readItems(items) {
  let work = blankWork();
  for (const item of Array.isArray(items) ? items : []) {
    const found = itemOf(item);
    if (found) work = addItem(work, found);
  }
  return work.items;
}

function parse(json) {
  try {
    const value = JSON.parse(json);
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

export function readWork(json, page) {
  const kept = parse(json);
  if (!kept) return blankWork();
  const fills = {};
  for (const [zone, token] of Object.entries(kept.fills && typeof kept.fills === "object" ? kept.fills : {})) {
    const at = /^(0|[1-9]\d?)$/.test(zone) ? Number(zone) : -1;
    if (at >= 0 && at < page.regions.length && isPaint(token)) fills[at] = token;
  }
  return { fills, items: readItems(kept.items) };
}

export function readDrawing(json) {
  const kept = parse(json);
  if (!kept) return blankDrawing();
  return { paper: blankDrawing(kept.paper).paper, items: readItems(kept.items) };
}
