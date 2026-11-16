import { stepBall } from "./ball.js";
import { rallyOf } from "./rally.js";
import { goalOf, movePaddle } from "./table.js";

export const FIRST_TO = 5;
// steps of 1/120 s
export const GOAL_PAUSE = 150;
export const WIDE_STEPS = 960;
const MOST_CATCH_UP = 60;

const copyRally = ({ balls, ...rally }) => ({ ...rally, bubbles: rally.bubbles.map((one) => ({ ...one })), pickup: rally.pickup && { ...rally.pickup } });

function copy(match) {
  return { ...match, lost: [...match.lost], paddles: match.paddles.map((one) => ({ ...one })), rally: copyRally(match.rally), balls: match.balls.map((one) => ({ ...one })) };
}

function serve(match) {
  const rally = rallyOf(match.seed, match.lost[0] + match.lost[1], match.lost, match.speed);
  match.rally = copyRally(rally);
  match.balls = rally.balls;
}

export function createMatch({ seed, speed, roundSteps }) {
  const match = { seed, speed, roundSteps, step: 0, lost: [0, 0], over: false, wait: 0, paddles: [0, 1].map(() => ({ x: 0.5, target: 0.5, wide: 0 })) };
  serve(match);
  return match;
}

export const scoreOf = (match, seat) => match.lost[1 - seat];

function endRally(match, seat, x, events) {
  match.lost[seat] += 1;
  match.balls = [];
  match.rally.bubbles = [];
  match.rally.pickup = null;
  match.wait = GOAL_PAUSE;
  events.push({ kind: "goal", seat, x, y: goalOf(seat) });
}

function runBall(match, ball, own, events) {
  const out = stepBall(ball, { bubbles: match.rally.bubbles, pickup: match.rally.pickup, paddles: match.paddles, own });
  for (const index of out.pops) match.rally.bubbles[index].popped = true;
  if (out.took) match.rally.pickup.taken = true;
  for (const event of out.events) {
    if (event.kind === "pick" && event.look === "star" && own[event.seat]) match.paddles[event.seat].wide = WIDE_STEPS;
    if (event.kind !== "goal") events.push(event);
  }
  const goal = out.events.find((one) => one.kind === "goal");
  return { ball: out.ball, goal };
}

function stepBalls(match, own, events) {
  const moved = [];
  for (const ball of match.balls) {
    const { ball: after, goal } = runBall(match, ball, own, events);
    if (goal) {
      endRally(match, goal.seat, goal.x, events);
      return;
    }
    moved.push(after);
  }
  match.balls = moved;
}

function checkOver(match) {
  if (match.step >= match.roundSteps || Math.max(...match.lost) >= FIRST_TO) match.over = true;
}

export function stepMatch(match, own) {
  if (match.over) return { match, events: [] };
  const next = copy(match);
  const events = [];
  next.step += 1;
  for (const paddle of next.paddles) movePaddle(paddle, paddle.speed);
  if (next.wait > 0) {
    next.wait -= 1;
    if (next.wait === 0) serve(next);
  } else stepBalls(next, own, events);
  checkOver(next);
  return { match: next, events };
}

export function learnLost(match, seat, lost) {
  if (!Number.isInteger(lost) || lost <= match.lost[seat]) return { match, events: [] };
  const next = copy(match);
  const events = [];
  const x = next.balls.find((one) => (seat === 0 ? one.vy > 0 : one.vy < 0))?.x ?? 0.5;
  endRally(next, seat, x, events);
  next.lost[seat] = lost;
  checkOver(next);
  return { match: next, events };
}

export function adoptBall(match, report, age, own) {
  const current = match.balls.find((one) => one.i === report.i);
  if (match.wait > 0 || report.k !== match.rally.k || (current && report.v <= current.v)) return { match, moved: null, events: [] };
  const next = copy(match);
  const events = [];
  let ball = { ...report, held: false };
  for (let at = 0; at < Math.min(MOST_CATCH_UP, age) && ball && !ball.out; at += 1) {
    const out = runBall(next, ball, own, events);
    if (out.goal) {
      endRally(next, out.goal.seat, out.goal.x, events);
      checkOver(next);
      return { match: next, moved: null, events };
    }
    ball = out.ball;
  }
  next.balls = [...next.balls.filter((one) => one.i !== report.i), ball].sort((one, two) => one.i - two.i);
  const moved = current ? { i: ball.i, x: ball.x - current.x, y: ball.y - current.y } : null;
  return { match: next, moved, events };
}

export function mergeRally(match, [k, popped, taken]) {
  if (k !== match.rally.k || match.wait > 0) return { match, events: [] };
  const fresh = match.rally.bubbles.map((bubble, index) => !bubble.popped && (popped >> index) & 1);
  const grab = Boolean(taken) && match.rally.pickup && !match.rally.pickup.taken;
  if (!fresh.some(Boolean) && !grab) return { match, events: [] };
  const next = copy(match);
  const events = [];
  fresh.forEach((now, index) => {
    if (!now) return;
    next.rally.bubbles[index].popped = true;
    events.push({ kind: "pop", x: next.rally.bubbles[index].x, y: next.rally.bubbles[index].y, index });
  });
  if (grab) next.rally.pickup.taken = true;
  return { match: next, events };
}

export const reports = (match, seat) => match.balls.filter((one) => one.by === seat);

export const poppedMask = (match) => match.rally.bubbles.reduce((mask, bubble, index) => (bubble.popped ? mask | (1 << index) : mask), 0);
