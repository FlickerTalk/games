import { pickLayout, pickPointer, savePlayer } from "../../../kit/src/avatars/index.js";
import { pressTargets, volumePointer as volumeCanvas, within } from "../../../kit/src/canvas/index.js";
import { KIND, checkBuilt, paint } from "./editor.js";
import { act } from "./menus.js";

const SHAKE_MS = 500;
const TAPS_ONLY = ["goal", "robot"];

export function paintAt(game, at, { dragging = false } = {}) {
  const { state } = game;
  const { build } = state;
  if (!build) return;
  const cells = build.level.cells;
  if (dragging) {
    if (TAPS_ONLY.includes(build.tool)) return;
    const kind = KIND[build.tool];
    if (build.mode === "." ? cells[at] !== kind : cells[at] === kind) return;
  }
  const done = paint(build.level, build.tool, at);
  if (done.refused) {
    if (!dragging) {
      state.moments.push({ kind: "shake", cell: at, start: game.now(), duration: SHAKE_MS });
      game.sound.play("error-soft");
    }
    return;
  }
  if (!done.changed) return;
  build.level = done.level;
  build.check = checkBuilt(done.level);
  if (!dragging) build.mode = done.level.cells[at];
  game.sound.play(dragging ? "tick" : "place", dragging ? { gain: 0.3 } : {});
}

export function volumePointer(game, event) {
  const { state } = game;
  return volumeCanvas(state, event, { volume: state.layout?.volume, controls: game.controls, targets: game.targets(), now: game.now, sync: game.syncSound });
}

function buildPointer(game, event) {
  const { state } = game;
  const targets = game.targets();
  if (event.type === "down") {
    if (targets.some((one) => one.kind !== "cell" && within(one, event))) return false;
    const cell = targets.find((one) => one.kind === "cell" && within(one, event));
    if (!cell) return false;
    state.painting = { id: event.id ?? null, last: cell.value };
    paintAt(game, cell.value);
    return true;
  }
  const painting = state.painting;
  if (!painting || (event.id ?? null) !== painting.id) return false;
  if (event.type === "move") {
    const cell = targets.find((one) => one.kind === "cell" && within(one, event));
    if (cell && cell.value !== painting.last) {
      painting.last = cell.value;
      paintAt(game, cell.value, { dragging: true });
    }
    return true;
  }
  state.painting = null;
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
  const press = (target) => (target.kind === "cell" ? undefined : act(game, target));
  if (state.paused) return pressTargets(state, game.targets(), event, press);
  if (volumePointer(game, event)) return undefined;
  if (state.screen === "build" && buildPointer(game, event)) return undefined;
  return pressTargets(state, game.targets(), event, press);
}
