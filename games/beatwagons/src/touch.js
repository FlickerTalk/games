import { pickLayout, pickPointer, savePlayer } from "../../../kit/src/avatars/index.js";
import { pressTargets, volumePointer as volumeCanvas, within } from "../../../kit/src/canvas/index.js";
import { act } from "./menus.js";
import { canPlace, placeWagon } from "./playing.js";
import { openGaps } from "./puzzle.js";

const DRAG_FROM = 10;

export function volumePointer(game, event) {
  const { state } = game;
  return volumeCanvas(state, event, { volume: state.layout?.volume, controls: game.controls, targets: game.targets(), now: game.now, sync: game.syncSound });
}

function gapUnder(game, point) {
  const { round, layout } = game.state;
  const { band, train } = layout;
  if (point.y < band.y || point.y > band.y + band.h) return null;
  const open = openGaps(round.puzzle);
  if (!open.length) return null;
  return open.reduce((near, gap) => (Math.abs(train.xs[gap] - point.x) < Math.abs(train.xs[near] - point.x) ? gap : near));
}

function startDrag(game, event) {
  const { state } = game;
  if (!canPlace(state.round)) return false;
  const cell = state.layout.cells.find((one) => within(one, event));
  if (!cell) return false;
  state.drag = { id: event.id ?? null, index: cell.value, x: event.x, y: event.y, fromX: event.x, fromY: event.y, moved: false };
  state.press = { kind: "candidate", value: cell.value };
  return true;
}

function dragPointer(game, event) {
  const { state } = game;
  if (event.type === "down") return startDrag(game, event);
  const drag = state.drag;
  if (!drag || (event.id ?? null) !== drag.id) return Boolean(drag);
  if (event.type === "move") {
    Object.assign(drag, { x: event.x, y: event.y });
    if (Math.hypot(event.x - drag.fromX, event.y - drag.fromY) > DRAG_FROM) drag.moved = true;
    return true;
  }
  state.drag = null;
  state.press = null;
  if (event.type !== "up") return true;
  if (!drag.moved) placeWagon(game, drag.index);
  else {
    const gap = gapUnder(game, event);
    if (gap !== null) placeWagon(game, drag.index, gap, { x: event.x, y: event.y });
  }
  return true;
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
    game.run(() => savePlayer(game.store, pick.choice));
  }
}

export function pointerOf(game, event) {
  const { state } = game;
  if (state.screen === "avatar") return avatarPointer(game, event);
  const press = (target) => act(game, target);
  if (state.paused) return pressTargets(state, game.targets(), event, press);
  if (volumePointer(game, event)) return undefined;
  if (state.screen === "play" && dragPointer(game, event)) return undefined;
  return pressTargets(state, game.targets(), event, press);
}
