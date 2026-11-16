import { STEP, TABLE, frontOf, goalOf, halfOf } from "./table.js";

export const SLOW = 0.5;
export const SLOW_STEPS = 600;
export const PICK_REACH = 0.06;
const GROWTH = 0.045;
const TOP = 1.5;
const ANGLE = 0.85;
const KICK = 0.45;
const R = TABLE.radius;

const towards = (ball) => (ball.vy > 0 ? 0 : 1);
const touches = (ball, x, y, reach) => (ball.x - x) ** 2 + (ball.y - y) ** 2 < (R + reach) ** 2;

// Only + - * / and one square root: two phones working out the same hit get the same numbers.
export function hitBall(ball, seat, paddle) {
  const reach = halfOf(paddle) + R;
  const offset = Math.max(-1, Math.min(1, (ball.x - paddle.x) / reach));
  const across = offset * ANGLE;
  const along = seat === 0 ? -1 : 1;
  const norm = Math.sqrt(across * across + 1);
  const hits = ball.hits + 1;
  const speed = ball.sp * Math.min(TOP, 1 + GROWTH * hits);
  return { ...ball, y: seat === 0 ? frontOf(0) - R : frontOf(1) + R, vx: (across / norm) * speed, vy: (along / norm) * speed, hits, v: ball.v + 1, by: seat, held: false };
}

function walls(next, events) {
  if (next.x < R) {
    next.x = 2 * R - next.x;
    next.vx = Math.abs(next.vx);
    events.push({ kind: "wall", x: next.x, y: next.y });
  } else if (next.x > 1 - R) {
    next.x = 2 * (1 - R) - next.x;
    next.vx = -Math.abs(next.vx);
    events.push({ kind: "wall", x: next.x, y: next.y });
  }
}

function bubbles(next, where, out) {
  where.bubbles.forEach((bubble, index) => {
    if (bubble.popped || out.pops.includes(index) || !touches(next, bubble.x, bubble.y, bubble.r)) return;
    const side = next.x < bubble.x ? -1 : 1;
    next.vx = side * Math.max(Math.abs(next.vx), KICK * Math.abs(next.vy));
    out.pops.push(index);
    out.events.push({ kind: "pop", x: bubble.x, y: bubble.y, index });
  });
}

function pickup(next, where, out) {
  const found = where.pickup;
  if (!found || found.taken || !touches(next, found.x, found.y, PICK_REACH)) return;
  out.took = true;
  if (found.look === "snail") next.slow = SLOW_STEPS;
  out.events.push({ kind: "pick", look: found.look, x: found.x, y: found.y, seat: 1 - towards(next) });
}

function atPaddle(ball, next, where, out) {
  const seat = towards(next);
  const front = frontOf(seat);
  const crossing = seat === 0 ? ball.y + R <= front && next.y + R > front : ball.y - R >= front && next.y - R < front;
  if (!crossing) return next;
  if (!where.own[seat]) return { ...ball, held: true };
  const paddle = where.paddles[seat];
  if (Math.abs(next.x - paddle.x) > halfOf(paddle) + R) return next;
  const hit = hitBall(next, seat, paddle);
  out.events.push({ kind: "hit", seat, x: hit.x, y: hit.y });
  return hit;
}

function atGoal(next, where, out) {
  const seat = towards(next);
  const past = seat === 0 ? next.y - R > goalOf(0) : next.y + R < goalOf(1);
  if (!past || !where.own[seat]) return next;
  out.events.push({ kind: "goal", seat, x: next.x, y: goalOf(seat) });
  return { ...next, out: true };
}

export function stepBall(ball, where) {
  const out = { events: [], pops: [], took: false };
  if (ball.out || (ball.held && !where.own[towards(ball)])) return { ball, ...out };
  const factor = ball.slow > 0 ? SLOW : 1;
  const next = { ...ball, x: ball.x + ball.vx * STEP * factor, y: ball.y + ball.vy * STEP * factor, slow: Math.max(0, ball.slow - 1), held: false };
  walls(next, out.events);
  bubbles(next, where, out);
  pickup(next, where, out);
  const after = atPaddle(ball, next, where, out);
  return { ball: after.held ? after : atGoal(after, where, out), ...out };
}
