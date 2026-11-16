import { pressTargets, within } from "../../../kit/src/canvas/index.js";
import { acrossOf } from "./layout.js";
import { act, soundPointer } from "./menus.js";

function seatAt(state, event) {
  const { round, layout } = state;
  const [near, far] = layout.zones;
  if (within(near, event)) return round.seat;
  if (round.kind === "pair" && within(far, event)) return 1 - round.seat;
  return null;
}

function aim(game, seat, event) {
  const { state } = game;
  const { round } = state;
  const u = acrossOf(state.layout, event);
  round.match.paddles[seat].target = round.seat === 0 ? u : 1 - u;
  if (!state.taught && seat === round.seat) {
    state.taught = true;
    game.saveOwn();
  }
}

export function playPointer(game, event) {
  const { state } = game;
  const press = (target) => act(game, target);
  if (state.paused || !state.round) return pressTargets(state, game.targets(), event, press);
  if (soundPointer(game, event)) return undefined;
  const { fingers } = state.round;
  const id = event.id ?? 0;
  if (event.type === "down" && !game.targets().some((one) => within(one, event))) {
    const seat = seatAt(state, event);
    if (seat === null) return undefined;
    fingers.set(id, seat);
    aim(game, seat, event);
    return undefined;
  }
  if (fingers.has(id)) {
    if (event.type === "move" || event.type === "up") aim(game, fingers.get(id), event);
    if (event.type === "up" || event.type === "cancel") fingers.delete(id);
    return undefined;
  }
  return pressTargets(state, game.targets(), event, press);
}
