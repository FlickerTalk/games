import { readMoves, writeMoves } from "./bout.js";
import { ROBOTS } from "./levels.js";

export const DUEL = Object.freeze({ g: "robotrumble", gv: 1 });
export const MOST_MOVES = 64;

const flag = (value) => (value === 1 ? 1 : value === 0 ? 0 : null);

export const stateOf = (told, { look, paused, ended }) => ({ c: writeMoves(told), k: look, p: paused ? 1 : 0, e: ended ? 1 : 0 });

export function checkState(s) {
  if (!s || typeof s !== "object" || Array.isArray(s)) return null;
  const [p, e] = [flag(s.p), flag(s.e)];
  if (p === null || e === null || readMoves(s.c, MOST_MOVES) === null) return null;
  return { c: s.c, k: ROBOTS.includes(s.k) ? s.k : ROBOTS[0], p, e };
}
