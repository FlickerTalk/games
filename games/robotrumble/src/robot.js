import { randomOf } from "../../../kit/src/canvas/random.js";
import { rivalPace } from "../../../kit/src/progress/rival.js";

const HABIT = 4;
const ATTACKS = "gbs";
const ANSWER = { g: "s", b: "g", s: "b", n: "g" };
const PACE = { even: 0, full: 4, slowest: 0.6, fastest: 1.1 };
const DOZE = 0.3;
const READ = 0.7;
const MEMORY = 3;

export function habitOf(seed) {
  const random = randomOf(`${seed}/habit`);
  const habit = Array.from({ length: HABIT }, () => ATTACKS[Math.floor(random() * ATTACKS.length)]);
  if (new Set(habit).size === 1) habit[HABIT - 1] = ATTACKS[(ATTACKS.indexOf(habit[0]) + 1) % ATTACKS.length];
  return habit;
}

function favourite(moves) {
  const recent = moves.slice(-MEMORY);
  const times = (move) => recent.filter((one) => one === move).length;
  return recent.reduce((best, move) => (times(move) >= times(best) ? move : best), recent[0]);
}

// gap: the hits Flick is ahead by
export function flickMove({ seed, index, theirs, skill, gap = 0 }) {
  const sure = Math.min(1, Math.max(0, skill * rivalPace(gap, PACE)));
  const random = randomOf(`${seed}/flick/${index}`);
  if (random() < (1 - sure) * DOZE) return "n";
  if (theirs.length >= 2 && random() < sure * READ) return ANSWER[favourite(theirs)];
  return habitOf(seed)[index % HABIT];
}
