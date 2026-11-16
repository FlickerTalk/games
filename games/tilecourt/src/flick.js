import { randomOf } from "../../../kit/src/canvas/random.js";
import { placeInRound, startRound } from "./round.js";
import { robotMove } from "./robot.js";

export function flickStart({ variant, seed, mix, skill }) {
  return { round: startRound({ variant, seed, mix }), skill, random: randomOf(`${seed}/flick`) };
}

function step(flick) {
  const move = robotMove(flick.round, { skill: flick.skill, random: flick.random });
  if (!move) return false;
  flick.round = placeInRound(flick.round, ...move).round;
  return true;
}

export function flickUpTo(flick, trays) {
  while (!flick.round.over && flick.round.tray < trays && step(flick));
  return flick;
}

export function flickFinish(flick) {
  while (!flick.round.over && step(flick));
  return flick;
}
