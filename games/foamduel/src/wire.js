import { STEPS_PER_SECOND, decodeClaims, encodeClaims } from "./duel.js";

export const DUEL = Object.freeze({ g: "foamduel", gv: 1 });
export const MOST_STEPS = 90 * STEPS_PER_SECOND;

const flag = (value) => (value === 1 ? 1 : value === 0 ? 0 : null);

export const stateOf = (round, { paused, ended }) => ({ c: encodeClaims(round.claims[round.seat]), n: round.step, p: paused ? 1 : 0, e: ended ? 1 : 0 });

export function checkState(s) {
  if (!s || typeof s !== "object" || Array.isArray(s)) return null;
  const [p, e] = [flag(s.p), flag(s.e)];
  if (p === null || e === null || !Number.isInteger(s.n) || s.n < 0 || s.n > MOST_STEPS || decodeClaims(s.c, 0) === null) return null;
  return { c: s.c, n: s.n, p, e };
}
