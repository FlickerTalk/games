import { hop } from "./rules.js";

const WIN = 1000;
const TURBO = 4;
const PUDDLE = -4;
const BUMP = 1.5;

export function worthOf(race, die) {
  const { event } = hop(race, die);
  if (event.won) return WIN;
  return event.to + (event.again ? TURBO : 0) + (event.kind === "puddle" ? PUDDLE : 0) + (event.bumped ? BUMP : 0);
}

export function flickPick(race, dice, { skill, random }) {
  const [first, second] = dice.map((die) => worthOf(race, die));
  const best = second > first ? 1 : 0;
  if (first === second || Math.max(first, second) >= WIN) return best;
  return random() < skill ? best : 1 - best;
}
