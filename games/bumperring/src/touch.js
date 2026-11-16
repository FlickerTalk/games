import { pressTargets, within } from "../../../kit/src/canvas/index.js";
import { press, release } from "./body.js";
import { seatAt } from "./layout.js";
import { act, soundPointer } from "./menus.js";

export const bodyOf = (round, slot) => round.match.bodies[slot === 0 ? round.seat : 1 - round.seat];

function learnt(game, slot) {
  const { state } = game;
  if (state.taught || slot !== 0) return;
  state.taught = true;
  game.saveOwn();
}

export function dashNow(game, slot) {
  const { round } = game.state;
  if (!round || slot >= game.state.layout.dash.length) return;
  const body = bodyOf(round, slot);
  press(body);
  release(body);
  learnt(game, slot);
}

function letGo(game, id) {
  const { round } = game.state;
  const slot = round.fingers.get(id);
  round.fingers.delete(id);
  if ([...round.fingers.values()].includes(slot)) return;
  release(bodyOf(round, slot));
  learnt(game, slot);
}

export function playPointer(game, event) {
  const { state } = game;
  const onPress = (target) => act(game, target);
  if (state.paused || !state.round) return pressTargets(state, game.targets(), event, onPress);
  if (soundPointer(game, event)) return undefined;
  const { fingers } = state.round;
  const id = event.id ?? 0;
  const bar = game.targets().filter((one) => one.kind !== "dash");
  if (event.type === "down" && !bar.some((one) => within(one, event))) {
    const slot = seatAt(state.layout, event);
    if (slot === null) return undefined;
    fingers.set(id, slot);
    press(bodyOf(state.round, slot));
    return undefined;
  }
  if (fingers.has(id)) {
    if (event.type === "up" || event.type === "cancel") letGo(game, id);
    return undefined;
  }
  return pressTargets(state, bar, event, onPress);
}
