import { within } from "../../../kit/src/canvas/layout.js";
import { act, pressTargets, volumePointer } from "./menus.js";
import { fireAt } from "./rounds.js";

const isButton = (target) => target.kind !== "ruler";

function aiming(game, event) {
  const { state } = game;
  if ((event.id ?? "one") !== state.aim.id) return;
  if (event.type === "move") state.aim = { ...state.aim, x: event.x };
  if (event.type === "cancel") state.aim = null;
  if (event.type !== "up") return;
  state.aim = null;
  fireAt(game, event.x);
}

export function playPointer(game, event) {
  const { state } = game;
  if (state.paused) return pressTargets(game, event, (target) => act(game, target));
  if (state.aim) return aiming(game, event);
  if (volumePointer(game, event)) return undefined;
  const onButton = game.targets().some((one) => isButton(one) && within(one, event));
  const free = state.round && !state.round.shot && !state.round.over;
  if (event.type === "down" && !onButton && free && state.layout && within(state.layout.touch, event)) {
    state.aim = { x: event.x, id: event.id ?? "one" };
    return undefined;
  }
  return pressTargets(game, event, (target) => isButton(target) && act(game, target));
}
