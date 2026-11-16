import { pickLayout, pickPointer, savePlayer } from "../../../kit/src/avatars/index.js";
import { pressTargets, volumePointer, within } from "../../../kit/src/canvas/index.js";
import { clearAt, endLine, extendLine, fillAt, placeStamp, rubOut, startLine, toPage, zoneUnder } from "./colouring.js";
import { snapScroll, stripMost, stripTargets } from "./layout.js";
import { act } from "./menus.js";
import { duoFill } from "./together.js";

const SLOP = 10;
const SWIPE = 60;
const MISS_MS = 700;

const moved = (press, event) => Math.abs(event.x - press.x) > SLOP || Math.abs(event.y - press.y) > SLOP;

function miss(game, event) {
  game.state.moments.push({ kind: "miss", x: event.x, y: event.y, start: game.now(), duration: MISS_MS });
}

function avatarPointer(game, event) {
  const { state } = game;
  const layout = pickLayout(state.pick, state.width, state.height, state.lang);
  const { state: pick, ask } = pickPointer(state.pick, layout, event);
  state.pick = pick;
  if (ask === "rename") game.onAsk("rename");
  if (ask === "done") {
    state.player = pick.choice;
    state.screen = "home";
    game.relayout();
    game.run(() => savePlayer(game.store, pick.choice));
  }
}

function tapZone(game, event) {
  const { state } = game;
  const zone = zoneUnder(state, event);
  const point = toPage(state, event);
  if (zone < 0) return miss(game, event);
  if (state.screen === "duo") return game.run(() => duoFill(game, zone, point));
  if (state.tool === "eraser") return clearAt(game, zone);
  return fillAt(game, zone, point);
}

function drawsLine(state) {
  if (state.screen === "page") return state.tool === "brush";
  return state.screen === "free" && state.freeTool.startsWith("brush");
}

const erases = (state) => (state.screen === "page" ? state.tool === "eraser" : state.screen === "free" && state.freeTool === "eraser");

function pageDown(game, event) {
  const { state } = game;
  state.press = { kind: "page", x: event.x, y: event.y, moved: false, erased: false };
  if (drawsLine(state)) startLine(game, event);
  else if (erases(state)) state.press.erased = rubOut(game, event);
}

function pageMove(game, event, press) {
  const { state } = game;
  press.moved ||= moved(press, event);
  if (drawsLine(state)) extendLine(game, event);
  else if (erases(state)) press.erased = rubOut(game, event) || press.erased;
}

function pageUp(game, event, press) {
  const { state } = game;
  if (drawsLine(state)) return endLine(game);
  if (event.type !== "up" || press.moved) return undefined;
  if (state.screen === "free") return state.freeTool.startsWith("stamp") ? placeStamp(game, event) : undefined;
  if (erases(state) && press.erased) return undefined;
  if (state.screen === "duo" && !game.duo?.status.myTurn) return undefined;
  return tapZone(game, event);
}

function stripPress(game, event, press) {
  const { state } = game;
  const strip = state.layout.strips.find((one) => one.id === press.strip);
  if (!strip) return;
  if (event.type === "move") {
    press.moved ||= moved(press, event);
    const delta = strip.vertical ? event.y - press.y : event.x - press.x;
    state.scroll[strip.id] = Math.max(0, Math.min(stripMost(strip), press.scroll - delta));
    return;
  }
  state.scroll[strip.id] = snapScroll(strip, state.scroll[strip.id] ?? 0);
  if (event.type !== "up" || press.moved) return;
  const item = stripTargets(strip, press.scroll).find((one) => one.visible && within(one, event));
  if (item) act(game, item);
}

function drawingPointer(game, event) {
  const { state } = game;
  const { layout } = state;
  if (event.type === "down") {
    const strip = layout.strips.find((one) => within(one, event));
    const button = layout.buttons.find((one) => within(one, event));
    if (strip) {
      const item = stripTargets(strip, state.scroll[strip.id] ?? 0).find((one) => one.visible && within(one, event));
      state.press = { kind: "strip", strip: strip.id, x: event.x, y: event.y, scroll: state.scroll[strip.id] ?? 0, moved: false, item: item && `${item.kind}:${item.value}` };
    }
    else if (button) state.press = { kind: button.kind, value: button.value };
    else if (within(layout.page, event)) pageDown(game, event);
    else state.press = null;
    return;
  }
  const press = state.press;
  if (!press) return;
  if (press.kind === "strip") {
    if (event.type !== "move") state.press = null;
    return stripPress(game, event, press);
  }
  if (press.kind === "page") {
    if (event.type === "move") return pageMove(game, event, press);
    state.press = null;
    return pageUp(game, event, press);
  }
  if (event.type === "move") return;
  state.press = null;
  const button = layout.buttons.find((one) => within(one, event));
  if (event.type === "up" && button?.kind === press.kind) act(game, button);
}

function gridPointer(game, event) {
  const { state } = game;
  const targets = game.targets();
  const hit = targets.find((one) => within(one, event)) ?? null;
  if (event.type === "down") {
    state.press = { kind: hit?.kind ?? "grid", value: hit?.value ?? null, x: event.x, y: event.y };
    return;
  }
  const press = state.press;
  if (!press || event.type === "move") return;
  state.press = null;
  if (event.type !== "up") return;
  const dx = event.x - press.x;
  if (Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(event.y - press.y)) return act(game, { kind: dx < 0 ? "next" : "prev" });
  if (hit && hit.kind === press.kind && hit.value === press.value) act(game, hit);
}

export function pointer(game, event) {
  const { state } = game;
  if (state.screen === "avatar") return avatarPointer(game, event);
  if (volumePointer(state, event, { volume: state.layout?.volume, controls: game.controls, targets: game.targets(), now: game.now, sync: game.syncSound })) return undefined;
  if (["page", "free", "duo"].includes(state.screen) && !game.prompting()) return drawingPointer(game, event);
  if (["shelf", "gallery"].includes(state.screen)) return gridPointer(game, event);
  return pressTargets(state, game.targets(), event, (target) => act(game, target));
}
