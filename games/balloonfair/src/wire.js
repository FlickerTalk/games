import { decodeClaims, encodeClaims } from "./fair.js";

export const DUEL = Object.freeze({ g: "balloonfair", gv: 1 });

const flag = (value) => (value === 1 ? 1 : value === 0 ? 0 : null);

export const stateOf = (round, { paused, ended }) => ({ c: encodeClaims(round.mine), p: paused ? 1 : 0, e: ended ? 1 : 0 });

export function checkState(s) {
  if (!s || typeof s !== "object" || Array.isArray(s)) return null;
  const [p, e] = [flag(s.p), flag(s.e)];
  if (p === null || e === null || decodeClaims(s.c, 0) === null) return null;
  return { c: s.c, p, e };
}
