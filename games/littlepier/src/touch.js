import { within } from "../../../kit/src/canvas/layout.js";
import { act, pressTargets, volumePointer } from "./menus.js";

const isButton = (target) => target.kind !== "water";

function startHolding(game, event) {
  const { state } = game;
  state.holding = true;
  state.finger = event.id ?? "one";
  state.hint = false;
  if (!state.taught) {
    state.taught = true;
    game.saveOwn();
  }
}

export function playPointer(game, event) {
  const { state } = game;
  if (state.paused) return pressTargets(game, event, (target) => act(game, target));
  if (state.finger !== null) {
    if ((event.id ?? "one") === state.finger && (event.type === "up" || event.type === "cancel")) Object.assign(state, { holding: false, finger: null });
    return undefined;
  }
  if (volumePointer(game, event)) return undefined;
  const onButton = game.targets().some((one) => isButton(one) && within(one, event));
  if (event.type === "down" && !onButton && state.layout && within(state.layout.hold, event)) return startHolding(game, event);
  return pressTargets(game, event, (target) => isButton(target) && act(game, target));
}
