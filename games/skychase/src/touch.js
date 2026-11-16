import { pressTargets, within } from "../../../kit/src/canvas/index.js";
import { TALL, WIDE, wrapped } from "./arena.js";
import { release, steer } from "./craft.js";
import { skyAt } from "./layout.js";
import { act, soundPointer } from "./menus.js";

// steps of 1/120 s a press of a turn button keeps turning
export const TURN_STEPS = 54;
const ASIDE = 0.3;

const mineOf = (round) => round.match.crafts[round.seat];

function learnt(game) {
  const { state } = game;
  if (state.taught) return;
  state.taught = true;
  game.saveOwn();
}

function aim(round, layout, point) {
  const { x, y } = skyAt(layout, point);
  round.turning = null;
  steer(mineOf(round), x, y);
}

export function turnNow(game, side) {
  const { round } = game.state;
  if (!round) return;
  round.turning = { side: side === "left" ? -1 : 1, steps: TURN_STEPS };
  learnt(game);
}

export function keepTurning(round) {
  const { turning } = round;
  if (!turning) return;
  const craft = mineOf(round);
  if (turning.steps <= 0) {
    round.turning = null;
    release(craft);
    return;
  }
  turning.steps -= 1;
  steer(craft, wrapped(craft.x, WIDE) - craft.hy * turning.side * ASIDE, wrapped(craft.y, TALL) + craft.hx * turning.side * ASIDE);
}

function lift(game, id) {
  const { round, layout } = game.state;
  round.fingers.delete(id);
  const left = [...round.fingers.values()].at(-1);
  if (left) aim(round, layout, left);
  else release(mineOf(round));
  learnt(game);
}

export function playPointer(game, event) {
  const { state } = game;
  const onPress = (target) => act(game, target);
  if (state.paused || !state.round) return pressTargets(state, game.targets(), event, onPress);
  if (soundPointer(game, event)) return undefined;
  const { round, layout } = state;
  const id = event.id ?? 0;
  const bar = game.targets().filter((one) => one.kind !== "steer");
  const onBar = within(layout.bar, event) || bar.some((one) => within(one, event));
  if (event.type === "down" && !onBar) {
    round.fingers.set(id, { x: event.x, y: event.y });
    aim(round, layout, event);
    return undefined;
  }
  if (round.fingers.has(id)) {
    if (event.type === "move") {
      round.fingers.set(id, { x: event.x, y: event.y });
      aim(round, layout, event);
    }
    if (event.type === "up" || event.type === "cancel") lift(game, id);
    return undefined;
  }
  return pressTargets(state, bar, event, onPress);
}
