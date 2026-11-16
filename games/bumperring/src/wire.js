import { CHARGE_STEPS, OUT, SAFE, STUN } from "./body.js";
import { RINGS } from "./levels.js";
import { KEPT_PUSHES } from "./match.js";

export const DUEL = Object.freeze({ g: "bumperring", gv: 1 });

const RANGES = {
  x: [-4, 4], y: [-4, 4], vx: [-12, 12], vy: [-12, 12], ax: [-1.001, 1.001], ay: [-1.001, 1.001],
  c: [-1, CHARGE_STEPS, true], q: [0, STUN, true], u: [0, OUT, true], s: [0, SAFE, true], l: [0, 20, true],
};
const PUSH = [[1, 100000, true], [-12, 12], [-12, 12]];

const within = (value, [low, high, whole]) => typeof value === "number" && Number.isFinite(value) && value >= low && value <= high && (!whole || Number.isInteger(value));
const flag = (value) => (value === 1 ? 1 : value === 0 ? 0 : null);
const short = (value) => Math.round(value * 1e4) / 1e4 + 0;

export function stateOf(match, seat, { look, paused, ended }) {
  const body = match.bodies[seat];
  return {
    x: short(body.x), y: short(body.y), vx: short(body.vx), vy: short(body.vy), ax: short(body.ax), ay: short(body.ay),
    c: Math.min(CHARGE_STEPS, body.hold), q: body.stun, u: body.out, s: body.safe, l: body.lost,
    k: look, p: paused ? 1 : 0, e: ended ? 1 : 0,
    h: match.told[seat].map(([n, jx, jy]) => [n, short(jx), short(jy)]),
  };
}

function readPush(one) {
  if (!Array.isArray(one) || one.length !== PUSH.length) return null;
  return PUSH.every((range, at) => within(one[at], range)) ? [...one] : null;
}

export function checkState(s) {
  if (!s || typeof s !== "object" || Array.isArray(s)) return null;
  const read = {};
  for (const [key, range] of Object.entries(RANGES)) {
    if (!within(s[key], range)) return null;
    read[key] = s[key];
  }
  const [p, e] = [flag(s.p), flag(s.e)];
  if (p === null || e === null || !Array.isArray(s.h) || s.h.length > KEPT_PUSHES) return null;
  const h = s.h.map(readPush);
  if (h.includes(null)) return null;
  return { ...read, k: RINGS.includes(s.k) ? s.k : RINGS[0], p, e, h };
}
