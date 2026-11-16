import { pressTargets, within } from "../../../kit/src/canvas/index.js";
import { snapAim } from "./kicks.js";
import { aimOf, toGoal } from "./layout.js";
import { act, soundPointer } from "./menus.js";
import { canDive, canShoot, dive, shoot } from "./rounds.js";

const TRAIL_MOST = 24;
const ROLES = ["shoot", "dive"];
const ACROSS = { left: 0.2, middle: 0.5, right: 0.8 };

export function roleOf(game) {
  const { round } = game.state;
  if (canShoot(round)) return "shoot";
  return canDive(round, game.now()) ? "dive" : null;
}

export function pressThird(game, target) {
  const point = { x: ACROSS[target.value] ?? 0.5, y: 0.4 };
  return target.kind === "shoot" ? shoot(game, snapAim(point)) : dive(game, point);
}

function swiping(game, event) {
  const { round, layout } = game.state;
  const { swipe } = round;
  if ((event.id ?? 0) !== swipe.id) return;
  if (event.type === "move") {
    if (swipe.points.length < TRAIL_MOST) swipe.points.push([event.x, event.y]);
    else swipe.points[TRAIL_MOST - 1] = [event.x, event.y];
    return;
  }
  round.swipe = null;
  const aim = event.type === "up" ? aimOf(layout, event) : null;
  if (!aim || !canShoot(round)) return;
  round.kick.trail = [...swipe.points, [event.x, event.y]];
  shoot(game, aim);
}

export function playPointer(game, event) {
  const { state } = game;
  const press = (target) => act(game, target);
  const controls = game.targets().filter((one) => !ROLES.includes(one.kind));
  if (state.paused || !state.round) return pressTargets(state, controls, event, press);
  if (state.round.swipe) return swiping(game, event);
  if (soundPointer(game, event)) return undefined;
  if (event.type === "down" && !controls.some((one) => within(one, event))) {
    const { round, layout } = state;
    if (canShoot(round) && within(layout.spot, event)) {
      round.swipe = { id: event.id ?? 0, points: [[layout.ball.x, layout.ball.y]] };
      return undefined;
    }
    if (canDive(round, game.now()) && within(layout.zone, event)) {
      dive(game, toGoal(layout, event));
      return undefined;
    }
  }
  return pressTargets(state, controls, event, press);
}
