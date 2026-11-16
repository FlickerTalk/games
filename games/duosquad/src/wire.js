import { decodeClaims, encodeClaims } from "./waves.js";

export const DUEL = Object.freeze({ g: "duosquad", gv: 1 });

const HULLS = 8;
const flag = (value) => (value === 1 ? 1 : value === 0 ? 0 : null);
const short = (value) => Math.round(value * 1e4) / 1e4 + 0;

export function stateOf(round, { hull, paused, ended }) {
  const craft = round.crafts[round.seat];
  return { u: short(craft.u), c: craft.caught > 0 ? 1 : 0, k: encodeClaims(round.mine), h: hull, p: paused ? 1 : 0, e: ended ? 1 : 0 };
}

export function checkState(s) {
  if (!s || typeof s !== "object" || Array.isArray(s)) return null;
  const [c, p, e] = [flag(s.c), flag(s.p), flag(s.e)];
  if (c === null || p === null || e === null) return null;
  if (typeof s.u !== "number" || !Number.isFinite(s.u) || s.u < 0 || s.u > 1) return null;
  if (decodeClaims(s.k, 0) === null) return null;
  return { u: s.u, c, k: s.k, h: Number.isInteger(s.h) && s.h >= 0 && s.h < HULLS ? s.h : 0, p, e };
}
