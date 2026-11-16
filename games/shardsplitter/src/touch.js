import { pickLayout, pickPointer, savePlayer } from "../../../kit/src/avatars/index.js";
import { pressTargets, volumePointer as volumeCanvas } from "../../../kit/src/canvas/input.js";
import { within } from "../../../kit/src/canvas/layout.js";
import { act } from "./menus.js";

export function volumePointer(game, event) {
  const { state } = game;
  return volumeCanvas(state, event, { volume: state.layout?.volume, controls: game.controls, targets: game.targets(), now: game.now, sync: game.syncSound });
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

function hitPointer(game, event) {
  if (event.type !== "down" || game.state.screen !== "play") return false;
  const hit = game.targets().find((target) => target.kind === "hit" && within(target, event));
  if (!hit) return false;
  game.state.press = { kind: hit.kind, value: hit.value };
  act(game, hit);
  return true;
}

export function pointerOf(game, event) {
  const { state } = game;
  if (state.screen === "avatar") return avatarPointer(game, event);
  const press = (target) => (target.kind === "hit" ? undefined : act(game, target));
  if (state.paused) return pressTargets(state, game.targets(), event, press);
  if (volumePointer(game, event)) return undefined;
  if (hitPointer(game, event)) return undefined;
  return pressTargets(state, game.targets(), event, press);
}
