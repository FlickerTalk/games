import { BODY, FIRST_TO, radiusOf, turned } from "./arena.js";
import { FALL_SHOW, OUT, createBody, pushBody, stepBody } from "./body.js";

export const KEPT_PUSHES = 4;
// steps of 1/120 s
const HIT_PAUSE = 30;
// platform radii a second
const LEAST_BUMP = 0.25;
const PUSH = 0.85;
const RECOIL = 1.1;
const BOUNCE = 0.6;
const CROSSED = 0.5;
const LEAN = 0.5;
const OTHER = ["x", "y", "vx", "vy", "ax", "ay", "hold", "stun", "out", "safe"];

export function createMatch({ seed, variant, roundSteps }) {
  return {
    seed, variant, roundSteps, step: 0, over: false,
    bodies: [createBody(0), createBody(1)],
    bar: { x: 1, y: 0 },
    hit: [0, 0],
    told: [[], []],
    count: [0, 0],
    heard: [0, 0],
  };
}

export const scoreOf = (match, seat) => Math.min(FIRST_TO, match.bodies[1 - seat].lost);

export const radiusNow = (match) => radiusOf(match.variant, match.step, match.roundSteps);

function lean(bodies, own, nx, ny, gap) {
  const share = own[0] && own[1] ? LEAN : 1;
  if (own[0]) {
    bodies[0].x -= nx * gap * share;
    bodies[0].y -= ny * gap * share;
  }
  if (own[1]) {
    bodies[1].x += nx * gap * share;
    bodies[1].y += ny * gap * share;
  }
}

function shove(match, own, pusher, [dx, dy], [fast, slow], gap, events) {
  const [mine, theirs] = [match.bodies[pusher], match.bodies[1 - pusher]];
  const back = fast * RECOIL + slow * BOUNCE;
  const away = fast * PUSH + slow;
  mine.vx -= dx * back;
  mine.vy -= dy * back;
  mine.x -= dx * gap;
  mine.y -= dy * gap;
  match.hit[pusher] = HIT_PAUSE;
  if (own[1 - pusher]) pushBody(theirs, dx * away, dy * away);
  else {
    match.count[pusher] += 1;
    match.told[pusher] = [...match.told[pusher], [match.count[pusher], dx * away, dy * away]].slice(-KEPT_PUSHES);
  }
  events.push({ kind: "bump", by: pusher, power: fast, x: (mine.x + theirs.x) / 2, y: (mine.y + theirs.y) / 2 });
}

function meet(match, own, events) {
  const [a, b] = match.bodies;
  if (a.out > 0 || b.out > 0 || a.safe > 0 || b.safe > 0) return;
  const [dx, dy] = [b.x - a.x, b.y - a.y];
  const far = Math.sqrt(dx * dx + dy * dy);
  if (far >= 2 * BODY) return;
  const [nx, ny] = far > 1e-6 ? [dx / far, dy / far] : [0, -1];
  const coming = [a.vx * nx + a.vy * ny, -(b.vx * nx + b.vy * ny)];
  const closing = coming[0] + coming[1];
  const gap = 2 * BODY - far;
  if (closing < LEAST_BUMP) {
    lean(match.bodies, own, nx, ny, gap);
    return;
  }
  const pusher = coming[1] > coming[0] ? 1 : 0;
  if (!own[pusher] || match.hit[pusher] > 0) return;
  shove(match, own, pusher, pusher === 0 ? [nx, ny] : [-nx, -ny], [coming[pusher], Math.max(0, coming[1 - pusher])], gap, events);
}

function checkOver(match) {
  const shown = match.bodies.some((body) => body.lost >= FIRST_TO && body.out <= OUT - FALL_SHOW);
  if (shown || match.step >= match.roundSteps) match.over = true;
}

export function stepMatch(match, own) {
  if (match.over) return [];
  const events = [];
  match.step += 1;
  if (match.variant === "bar") match.bar = turned(match.bar, "bar");
  const arena = { variant: match.variant, radius: radiusNow(match), bar: match.bar };
  match.bodies.forEach((body, seat) => {
    if (match.hit[seat] > 0) match.hit[seat] -= 1;
    if (own[seat]) stepBody(body, arena, events);
  });
  meet(match, own, events);
  checkOver(match);
  return events;
}

export function placeOther(match, seat, fields) {
  const body = match.bodies[seat];
  for (const key of OTHER) if (fields[key] !== undefined) body[key] = fields[key];
}

export function takePushes(match, seat, list) {
  const events = [];
  const body = match.bodies[seat];
  for (const [n, jx, jy] of list) {
    if (n <= match.heard[seat]) continue;
    match.heard[seat] = n;
    const share = match.hit[seat] > 0 ? CROSSED : 1;
    if (!pushBody(body, jx * share, jy * share)) continue;
    events.push({ kind: "bump", by: 1 - seat, power: Math.sqrt(jx * jx + jy * jy), x: body.x, y: body.y });
  }
  return events;
}

export function learnLost(match, seat, lost) {
  const body = match.bodies[seat];
  if (!Number.isInteger(lost) || lost <= body.lost) return [];
  body.lost = lost;
  return [{ kind: "point", seat: 1 - seat, x: match.bodies[1 - seat].x, y: match.bodies[1 - seat].y }];
}
