import { PAGE_H, PAGE_W, zoneAt, zonesOf } from "./geometry.js";
import { NOW_KEY, SLOTS, addToWall, loadDrawing, loadWork, saveDrawing, saveOwn, saveWall, saveWork } from "./keep.js";
import { PROGRESS, finishPicture } from "./levels.js";
import { pageOf } from "./pages.js";
import { paintToken } from "./paints.js";
import { addItem, blankDrawing, clearZone, eraseAt, fillZone, isFinished, simplify } from "./work.js";

export const SPREAD_MS = 450;
export const FINISH_MS = 900;
const HISTORY = 40;
const FINGER = 10;

export const tokenOf = (state) => paintToken({ colour: state.colour, pattern: state.pattern });

export function toPage(state, { x, y }) {
  const box = state.layout?.page;
  if (!box?.scale) return null;
  const point = { x: (x - box.x) / box.scale, y: (y - box.y) / box.scale };
  return point.x >= 0 && point.y >= 0 && point.x <= PAGE_W && point.y <= PAGE_H ? point : null;
}

export function saveOwnState(game) {
  const { state } = game;
  const own = { variant: state.variant, taught: state.taught, colour: state.colour, pattern: state.pattern, done: state.done, saved: state.saved, shared: state.shared };
  return game.run(() => saveOwn(game.store, own));
}

function keep(game) {
  const { state } = game;
  if (state.screen === "page") {
    const { page, work } = state;
    game.run(() => saveWork(game.store, page, work));
  }
  if (state.screen === "free") {
    const { drawing } = state;
    game.run(() => saveDrawing(game.store, NOW_KEY, drawing));
  }
}

function change(game, next) {
  const { state } = game;
  const current = state.screen === "free" ? state.drawing : state.work;
  state.history = [...state.history, current].slice(-HISTORY);
  if (state.screen === "free") state.drawing = next;
  else state.work = next;
  keep(game);
}

export async function openPage(game, id) {
  const { state } = game;
  const page = pageOf(id);
  state.page = id;
  state.work = await loadWork(game.store, page);
  Object.assign(state, { screen: "page", history: [], spreads: [], stroke: null, endAt: null, picture: null });
  zonesOf(page);
  game.relayout();
}

export async function openFree(game, { fresh = false, picture = null } = {}) {
  const { state } = game;
  const kept = fresh ? null : (picture?.drawing ?? (await loadDrawing(game.store, NOW_KEY)));
  state.drawing = kept ? { paper: kept.paper, items: kept.items } : blankDrawing(state.drawing?.paper);
  if (picture) state.drawingSlot = picture.slot;
  else if (fresh) state.drawingSlot = null;
  Object.assign(state, { screen: "free", history: [], stroke: null, picture: null });
  game.relayout();
  if (fresh || picture) keep(game);
}

export function teach(game) {
  if (game.state.taught) return;
  game.state.taught = true;
  saveOwnState(game);
}

export function spread(game, zone, point, from, by = "me") {
  const [x, y] = point ?? zonesOf(pageOf(game.state.page))[zone].anchor;
  game.state.spreads = [...game.state.spreads.filter((one) => one.zone !== zone), { zone, x, y, from, by, start: game.now() }];
}

export function fillAt(game, zone, point = null) {
  const { state } = game;
  const page = pageOf(state.page);
  const token = tokenOf(state);
  const before = state.work.fills[zone];
  if (before === token) return;
  const done = isFinished(page, state.work);
  change(game, fillZone(state.work, zone, token));
  spread(game, zone, point && [point.x, point.y], before);
  game.sound.play("tick", { pitch: 0.9 + (zone % 5) * 0.05 });
  teach(game);
  if (!done && isFinished(page, state.work)) state.endAt = game.now() + FINISH_MS;
}

export function clearAt(game, zone) {
  const { state } = game;
  if (state.work.fills[zone] === undefined) return;
  change(game, clearZone(state.work, zone));
  game.sound.play("pop", { gain: 0.5 });
}

export function zoneUnder(state, point) {
  const at = toPage(state, point);
  return at ? zoneAt(pageOf(state.page), at.x, at.y) : -1;
}

const widthOf = (state) => (state.screen === "page" ? 0 : Number(state.freeTool.slice(5)));

export function startLine(game, point) {
  const { state } = game;
  const at = toPage(state, point);
  if (!at) return false;
  state.stroke = { p: state.colour, w: widthOf(state), m: state.screen === "free" && state.mirror ? 1 : 0, points: [[at.x, at.y]] };
  return true;
}

export function extendLine(game, point) {
  const { stroke, layout } = game.state;
  if (!stroke) return;
  const box = layout.page;
  stroke.points.push([Math.max(0, Math.min(PAGE_W, (point.x - box.x) / box.scale)), Math.max(0, Math.min(PAGE_H, (point.y - box.y) / box.scale))]);
}

export function endLine(game) {
  const { state } = game;
  const { stroke } = state;
  state.stroke = null;
  if (!stroke) return;
  const current = state.screen === "free" ? state.drawing : state.work;
  const next = addItem(current, { k: "l", p: stroke.p, w: stroke.w, m: stroke.m, pts: simplify(stroke.points) });
  if (next === current) return void game.sound.play("error-soft");
  change(game, next);
  game.sound.play("place", { gain: 0.4 });
}

export function placeStamp(game, point) {
  const { state } = game;
  const at = toPage(state, point);
  if (!at) return;
  const next = addItem(state.drawing, { k: "s", t: Number(state.freeTool.slice(5)), p: state.colour, x: Math.round(at.x), y: Math.round(at.y), m: state.mirror ? 1 : 0 });
  if (next === state.drawing) return void game.sound.play("error-soft");
  change(game, next);
  game.sound.play("pop");
}

export function rubOut(game, point) {
  const { state } = game;
  const at = toPage(state, point);
  if (!at) return false;
  const current = state.screen === "free" ? state.drawing : state.work;
  const next = eraseAt(current, at.x, at.y, FINGER);
  if (next === current) return false;
  change(game, next);
  return true;
}

export function undo(game) {
  const { state } = game;
  const last = state.history.at(-1);
  if (!last) return;
  state.history = state.history.slice(0, -1);
  if (state.screen === "free") state.drawing = last;
  else state.work = last;
  state.spreads = [];
  state.endAt = null;
  keep(game);
  game.sound.play("tap");
}

export function setPaper(game, kind) {
  const { state } = game;
  if (state.drawing.paper !== kind) change(game, { ...state.drawing, paper: kind });
}

function award(game) {
  const { state } = game;
  const { record, gift } = finishPicture(state.progress);
  state.progress = record;
  game.run(() => PROGRESS.save(game.store, record));
  return gift;
}

export function hang(game, entry) {
  const { state } = game;
  state.wall = addToWall(state.wall, entry);
  const wall = state.wall;
  game.run(() => saveWall(game.store, wall));
}

export function showPicture(game, picture) {
  const { state } = game;
  Object.assign(state, { screen: "picture", picture, spreads: [], endAt: null });
  state.moments.push({ kind: "confetti", start: game.now(), duration: 2400 });
  game.relayout();
}

export function finishPage(game) {
  const { state } = game;
  state.endAt = null;
  const first = !state.done.includes(state.page);
  const gift = first ? award(game) : null;
  if (first) state.done = [...state.done, state.page];
  saveOwnState(game);
  hang(game, `p:${state.page}`);
  showPicture(game, { kind: "page", page: state.page, work: state.work, from: "page", gift, opened: false });
  game.sound.play(gift ? "win" : "success");
}

export function finishFree(game) {
  const { state } = game;
  if (!state.drawing.items.length) return void game.sound.play("error-soft");
  const slot = state.drawingSlot ?? state.saved % SLOTS;
  if (state.drawingSlot === null) state.saved += 1;
  const drawing = state.drawing;
  game.run(() => saveDrawing(game.store, `free/${slot}`, drawing));
  const gift = award(game);
  saveOwnState(game);
  hang(game, `f:${slot}`);
  state.drawingSlot = null;
  state.drawing = blankDrawing(drawing.paper);
  game.run(() => saveDrawing(game.store, NOW_KEY, state.drawing));
  showPicture(game, { kind: "free", drawing, slot, from: "free", gift, opened: false });
  game.sound.play(gift ? "win" : "success");
}
