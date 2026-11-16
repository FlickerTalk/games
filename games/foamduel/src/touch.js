import { pressTargets, within } from "../../../kit/src/canvas/index.js";
import { seatAt } from "./layout.js";
import { act, seatOfPad, soundPointer } from "./menus.js";
import { strike } from "./rounds.js";

// A strike counts when the finger lands, not when it lifts: the pads are pressed on the way down.
export function playPointer(game, event) {
  const { state } = game;
  const { round, layout } = state;
  const press = (target) => act(game, target);
  if (state.paused || !round) return pressTargets(state, game.targets(), event, press);
  if (soundPointer(game, event)) return undefined;
  const buttons = game.targets().filter((one) => one.kind !== "strike");
  if (event.type === "down" && !buttons.some((one) => within(one, event))) {
    const pad = seatAt(layout, event);
    if (pad === null) return undefined;
    state.press = { kind: "strike", value: pad };
    strike(game, seatOfPad(round, pad));
    return undefined;
  }
  if (state.press?.kind === "strike") {
    if (event.type === "up" || event.type === "cancel") state.press = null;
    return undefined;
  }
  return pressTargets(state, buttons, event, press);
}
