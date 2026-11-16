import { BAR, BODY, DT, FLOAT, START, TRAMPOLINE, barOffset, onIce, turned } from "./arena.js";

// steps of 1/120 s
export const CHARGE_STEPS = 108;
export const COOL = 36;
export const STUN = 48;
export const OUT = 228;
export const FALL_SHOW = 96;
export const SAFE = 144;
// platform radii a second
export const DASH = Object.freeze({ least: 0.8, most: 2.4 });

const FRICTION = 0.984;
const ICE_FRICTION = 0.997;
const DRIFT = 0.95;
const REST = 0.02;
const FAST = 0.8;
const BOING = Object.freeze({ under: 0.4, least: 0.7, most: 1.1, kept: 0.6 });
const BAR_KICK = 0.15;
const BAR_BOUNCE = 0.6;

export const SLIDE = DT / (1 - FRICTION);

export function createBody(seat) {
  const [x, y] = START[seat];
  return { seat, x, y, vx: 0, vy: 0, ax: 0, ay: seat === 0 ? -1 : 1, down: false, tap: false, hold: -1, cool: 0, stun: 0, out: 0, safe: 0, lost: 0 };
}

export const chargeOf = (body) => (body.hold < 0 ? 0 : Math.min(1, body.hold / CHARGE_STEPS));

export const speedOf = (body) => Math.sqrt(body.vx * body.vx + body.vy * body.vy);

export function poseOf(body) {
  if (body.out > 0) return OUT - body.out < FALL_SHOW ? "falling" : "swim";
  if (body.stun > 0) return "bumped";
  if (body.hold >= 0) return "charging";
  if (speedOf(body) > FAST) return "dash";
  return body.safe > 0 ? "back" : "idle";
}

export function press(body) {
  body.down = true;
  body.tap = true;
}

export function release(body) {
  body.down = false;
}

export function pushBody(body, jx, jy) {
  if (body.out > 0 || body.safe > 0) return false;
  body.vx += jx;
  body.vy += jy;
  body.hold = -1;
  body.stun = STUN;
  return true;
}

function dash(body, events) {
  const power = chargeOf(body);
  const speed = DASH.least + power * (DASH.most - DASH.least);
  Object.assign(body, { vx: body.ax * speed, vy: body.ay * speed, hold: -1, cool: COOL });
  events.push({ kind: "dash", seat: body.seat, power, x: body.x, y: body.y });
}

function finger(body, events) {
  if (body.hold >= 0) {
    if (body.stun > 0) body.hold = -1;
    else if (!body.down && !body.tap) dash(body, events);
    else body.hold += 1;
  } else if ((body.down || body.tap) && body.stun === 0 && body.cool === 0) body.hold = 0;
  body.tap = false;
}

function slide(body, variant) {
  body.x += body.vx * DT;
  body.y += body.vy * DT;
  const friction = variant === "ice" && onIce(body.x, body.y) ? ICE_FRICTION : FRICTION;
  body.vx *= friction;
  body.vy *= friction;
  if (speedOf(body) < REST) Object.assign(body, { vx: 0, vy: 0 });
}

function trampoline(body, events) {
  const far = Math.sqrt(body.x * body.x + body.y * body.y);
  if (far >= TRAMPOLINE) return;
  const [nx, ny] = far > 1e-6 ? [body.x / far, body.y / far] : [body.ax, body.ay];
  const outward = body.vx * nx + body.vy * ny;
  if (outward >= BOING.under) return;
  const speed = Math.min(BOING.most, Math.max(BOING.least, BOING.kept * Math.abs(outward)));
  body.vx += (speed - outward) * nx;
  body.vy += (speed - outward) * ny;
  events.push({ kind: "boing", seat: body.seat, x: body.x, y: body.y });
}

function bar(body, turning, events) {
  const { along, across } = barOffset(turning, body.x, body.y);
  const reach = BODY * 0.5 + BAR.thick;
  if (Math.abs(along) > BAR.half + BODY * 0.5 || Math.abs(across) >= reach) return;
  const side = across >= 0 ? 1 : -1;
  const [px, py] = [-turning.y, turning.x];
  const gap = reach - Math.abs(across);
  body.x += px * side * gap;
  body.y += py * side * gap;
  const sweep = BAR.turn * along;
  const into = (body.vx * px + body.vy * py - sweep) * side;
  if (into >= BAR_KICK) return;
  const after = Math.max(BAR_KICK, -into * BAR_BOUNCE);
  body.vx += px * side * (after - into);
  body.vy += py * side * (after - into);
  events.push({ kind: "bar", seat: body.seat, x: body.x, y: body.y });
}

function afloat(body, events) {
  body.out -= 1;
  body.x += body.vx * DT;
  body.y += body.vy * DT;
  body.vx *= DRIFT;
  body.vy *= DRIFT;
  const far = Math.sqrt(body.x * body.x + body.y * body.y);
  if (far > FLOAT) Object.assign(body, { x: (body.x / far) * FLOAT, y: (body.y / far) * FLOAT, vx: 0, vy: 0 });
  if (body.out > 0) return;
  const [x, y] = START[body.seat];
  Object.assign(body, { x, y, vx: 0, vy: 0, ax: 0, ay: body.seat === 0 ? -1 : 1, safe: SAFE, cool: 0, stun: 0 });
  events.push({ kind: "back", seat: body.seat, x, y });
}

export function stepBody(body, { variant, radius, bar: turning }, events) {
  if (body.out > 0) return afloat(body, events);
  for (const key of ["cool", "stun", "safe"]) if (body[key] > 0) body[key] -= 1;
  finger(body, events);
  if (body.hold < 0) {
    const arrow = turned({ x: body.ax, y: body.ay }, "arrow");
    body.ax = arrow.x;
    body.ay = arrow.y;
  }
  slide(body, variant);
  if (variant === "trampoline") trampoline(body, events);
  if (variant === "bar") bar(body, turning, events);
  if (body.x * body.x + body.y * body.y <= radius * radius) return undefined;
  Object.assign(body, { out: OUT, lost: body.lost + 1, hold: -1, stun: 0 });
  events.push({ kind: "fall", seat: body.seat, x: body.x, y: body.y });
  return undefined;
}
