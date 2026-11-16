import { pressTargets, within } from "../../../kit/src/canvas/index.js";
import { fromScreen } from "./layout.js";
import { act, soundPointer } from "./menus.js";

function playable(game) {
  const { round, paused } = game.state;
  return !paused && game.now() >= round.startAt && !round.sent && round.heard?.p !== 1;
}

function steer(game, event) {
  const { state } = game;
  const { round, layout } = state;
  if (event.type === "up" || event.type === "cancel") {
    state.steer = null;
    return;
  }
  if (!playable(game)) return;
  round.crafts[round.seat].want = fromScreen(layout, event).u;
  if (!state.taught.includes("steer")) game.teach("steer");
}

export function playPointer(game, event) {
  const { state } = game;
  const { round, layout } = state;
  const press = (target) => act(game, target);
  if (state.paused || !round) return pressTargets(state, game.targets(), event, press);
  if (soundPointer(game, event)) return undefined;
  const id = event.id ?? 0;
  if (state.steer === id) return steer(game, event);
  if (event.type === "down" && within(layout.field, event) && !game.targets().some((one) => within(one, event))) {
    state.steer = id;
    return steer(game, event);
  }
  return pressTargets(state, game.targets(), event, press);
}
