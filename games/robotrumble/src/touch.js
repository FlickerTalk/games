import { pressTargets, within } from "../../../kit/src/canvas/index.js";
import { act, soundPointer } from "./menus.js";

const BITS = { glove: 1, boot: 2 };
const BOTH = 3;

export const isControl = (target) => Object.hasOwn(BITS, target.kind);

// One button is that move, the other one added is the shield, and a tap on the shield goes back to the button tapped.
export function heldAfter(held, kind) {
  const bit = BITS[kind];
  return held === 0 || held === BOTH || held === bit ? bit : BOTH;
}

export function tapControl(game, target) {
  const { state } = game;
  const { round } = state;
  if (!round || state.paused || round.sent || round.endAt !== null) return;
  const seat = round.kind === "pair" ? target.value : 0;
  round.held[seat] = heldAfter(round.held[seat], target.kind);
  game.sound.play("tap");
  if (!state.taught) {
    state.taught = true;
    game.saveOwn();
  }
}

export function playPointer(game, event) {
  const { state } = game;
  const press = (target) => act(game, target);
  if (state.paused || !state.round) return pressTargets(state, game.targets(), event, press);
  if (soundPointer(game, event)) return undefined;
  const control = game.targets().find((one) => isControl(one) && within(one, event));
  if (control) {
    if (event.type === "down") tapControl(game, control);
    return undefined;
  }
  return pressTargets(state, game.targets(), event, press);
}
