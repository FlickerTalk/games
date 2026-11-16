import { turnOf, usefulNow } from "./round.js";

export const FLICK_PACE = 1200;
const SMALLEST_CHANCE = 0.75;

export function flickHit(round, side, random) {
  if (turnOf(round) !== side) return null;
  const fitting = usefulNow(round, side);
  if (random() < SMALLEST_CHANCE || fitting.length === 1) return fitting[0];
  return fitting[1 + Math.floor(random() * (fitting.length - 1))];
}
