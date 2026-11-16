import { BALLOONS } from "./arena.js";
import { HOVER, OUT_SHOW, SAFE } from "./craft.js";
import { COLOURS, HELICOPTERS, PLANES } from "./levels.js";
import { LOCK } from "./match.js";

export const DUEL = Object.freeze({ g: "skychase", gv: 1 });

const CRAFTS = [...PLANES, ...HELICOPTERS];
// x and y are not wrapped, so the other phone can glide between two of them
const RANGES = {
  x: [-400, 400], y: [-400, 400], hx: [-1.001, 1.001], hy: [-1.001, 1.001], v: [0, 2],
  a: [0, LOCK + 8], s: [0, SAFE, true], u: [0, OUT_SHOW + 2, true], b: [0, 400, true], r: [0, HOVER, true],
  n: [-1, 1, true], l: [0, BALLOONS, true],
};
const FLAGS = ["d", "p", "e"];

const within = (value, [low, high, whole]) => typeof value === "number" && Number.isFinite(value) && value >= low && value <= high && (!whole || Number.isInteger(value));
const short = (value) => Math.round(value * 1e4) / 1e4 + 0;

export function stateOf(match, seat, { craft, colour, paused, ended }) {
  const mine = match.crafts[seat];
  return {
    x: short(mine.x), y: short(mine.y), hx: short(mine.hx), hy: short(mine.hy), v: short(mine.speed),
    a: short(mine.lock), s: mine.safe, u: Math.min(OUT_SHOW + 2, mine.out), b: mine.boost, r: mine.rest, n: mine.bank,
    l: Math.min(BALLOONS, mine.lost), d: mine.down ? 1 : 0, k: craft, c: colour, p: paused ? 1 : 0, e: ended ? 1 : 0,
  };
}

export function checkState(s) {
  if (!s || typeof s !== "object" || Array.isArray(s)) return null;
  const read = {};
  for (const [key, range] of Object.entries(RANGES)) {
    if (!within(s[key], range)) return null;
    read[key] = s[key];
  }
  for (const key of FLAGS) {
    if (s[key] !== 0 && s[key] !== 1) return null;
    read[key] = s[key];
  }
  return { ...read, k: CRAFTS.includes(s.k) ? s.k : CRAFTS[0], c: COLOURS.includes(s.c) ? s.c : COLOURS[0] };
}
