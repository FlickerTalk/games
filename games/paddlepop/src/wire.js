import { poppedMask, reports } from "./match.js";
import { PADDLES } from "./levels.js";

export const DUEL = Object.freeze({ g: "paddlepop", gv: 1 });

const BALL = ["i", "k", "v", "by", "x", "y", "vx", "vy", "sp", "slow", "hits"];
const RANGES = { i: [0, 1, true], k: [0, 30, true], v: [0, 100000, true], by: [0, 1, true], x: [-0.5, 1.5], y: [-1, 2.5], vx: [-5, 5], vy: [-5, 5], sp: [0.01, 3], slow: [0, 100000, true], hits: [0, 100000, true] };

const within = (value, [low, high, whole]) => typeof value === "number" && Number.isFinite(value) && value >= low && value <= high && (!whole || Number.isInteger(value));
const flag = (value) => (value === 1 ? 1 : value === 0 ? 0 : null);

export function stateOf(match, seat, { look, paused, ended }) {
  const paddle = match.paddles[seat];
  return {
    x: paddle.x,
    w: paddle.wide > 0 ? 1 : 0,
    k: look,
    p: paused ? 1 : 0,
    l: match.lost[seat],
    e: ended ? 1 : 0,
    r: [match.rally.k, poppedMask(match), match.rally.pickup?.taken ? 1 : 0],
    b: reports(match, seat).map((ball) => BALL.map((key) => ball[key])),
  };
}

function readBall(list) {
  if (!Array.isArray(list) || list.length !== BALL.length) return null;
  const ball = Object.fromEntries(BALL.map((key, at) => [key, list[at]]));
  return BALL.every((key) => within(ball[key], RANGES[key])) ? ball : null;
}

export function checkState(s) {
  if (!s || typeof s !== "object" || Array.isArray(s)) return null;
  const [w, p, e] = [flag(s.w), flag(s.p), flag(s.e)];
  if (!within(s.x, [0, 1]) || w === null || p === null || e === null || !within(s.l, [0, 20, true])) return null;
  if (!Array.isArray(s.r) || s.r.length !== 3 || !within(s.r[0], [0, 30, true]) || !within(s.r[1], [0, 255, true]) || flag(s.r[2]) === null) return null;
  if (!Array.isArray(s.b) || s.b.length > 2) return null;
  const b = s.b.map(readBall);
  if (b.includes(null)) return null;
  return { x: s.x, w, k: PADDLES.includes(s.k) ? s.k : PADDLES[0], p, l: s.l, e, r: [...s.r], b };
}
