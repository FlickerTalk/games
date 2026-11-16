import { DT, START, TALL, WIDE, apart, inWind, shipAt, wrapped } from "./arena.js";

// speeds in sky widths a second; turn is the cosine and sine of the angle turned in one step
export const FAMILIES = Object.freeze({
  plane: Object.freeze({ cruise: 0.4, fast: 0.5, turn: Object.freeze([0.9997806834748455, 0.020942419883356957]), hovers: false }),
  helicopter: Object.freeze({ cruise: 0.34, fast: 0.43, turn: Object.freeze([0.9996573249755573, 0.02617694830787315]), hovers: true }),
});

// the finger's place is on the screen, so an aircraft turns to it across the sky it sees, never over the edge
// steps of 1/120 s
export const HOVER = 108;
export const SAFE = 200;
export const HURT = 60;
export const OUT_SHOW = 190;
const BOOST = 150;
const RING_REST = 360;
const BONK_REST = 60;

const EASE = 0.1;
const BOOSTED = 1.45;
const DRIFT = 0.07;
const RING_REACH = 0.8;
const TOO_NEAR = 0.03;

export function createCraft(seat, family = "plane") {
  const { x, y, hx, hy } = START[seat];
  return {
    seat, family, x, y, hx, hy, speed: FAMILIES[family].cruise, pace: 1,
    down: false, tx: x, ty: y, bank: 0, rest: 0, boost: 0, ringRest: 0, bonkRest: 0,
    lock: 0, safe: 0, hurt: 0, lost: 0, out: 0,
  };
}

export function steer(craft, x, y) {
  Object.assign(craft, { down: true, tx: x, ty: y, rest: 0 });
}

export function release(craft) {
  if (craft.down && FAMILIES[craft.family].hovers) craft.rest = HOVER;
  craft.down = false;
}

export function poseOf(craft) {
  if (craft.out > 0) return "losing";
  if (craft.hurt > 0) return "hit";
  if (craft.bank !== 0) return craft.bank > 0 ? "bankRight" : "bankLeft";
  if (craft.boost > 0 || craft.down) return "speed";
  return craft.rest > 0 ? "hover" : "idle";
}

function turn(craft, [cos, sin]) {
  const [dx, dy] = [craft.tx - wrapped(craft.x, WIDE), craft.ty - wrapped(craft.y, TALL)];
  const far = Math.sqrt(dx * dx + dy * dy);
  craft.bank = 0;
  if (far < TOO_NEAR) return;
  const cross = craft.hx * dy - craft.hy * dx;
  const along = craft.hx * dx + craft.hy * dy;
  if (along > 0 && Math.abs(cross) <= sin * far) {
    craft.hx = dx / far;
    craft.hy = dy / far;
    return;
  }
  const side = cross >= 0 ? 1 : -1;
  const [nx, ny] = [craft.hx * cos - craft.hy * sin * side, craft.hx * sin * side + craft.hy * cos];
  const length = Math.sqrt(nx * nx + ny * ny);
  Object.assign(craft, { hx: nx / length, hy: ny / length, bank: side });
}

function wanted(craft, kind) {
  if (craft.out > 0) return DRIFT;
  const base = craft.down ? kind.fast : craft.rest > 0 ? 0 : kind.cruise;
  return base * (craft.boost > 0 ? BOOSTED : 1);
}

function throughRing(craft, ring, events) {
  if (!ring || craft.ringRest > 0 || apart(ring, craft).far > ring.r * RING_REACH) return;
  craft.boost = BOOST;
  craft.ringRest = RING_REST;
  events.push({ kind: "ring", seat: craft.seat, x: ring.x, y: ring.y });
}

function roundShip(craft, airship, step, events) {
  if (!airship) return;
  const ship = shipAt(airship, step);
  const { dx, dy, far } = apart(ship, craft);
  if (far >= ship.r) return;
  const [nx, ny] = far > 1e-6 ? [dx / far, dy / far] : [-craft.hx, -craft.hy];
  craft.x += nx * (ship.r - far);
  craft.y += ny * (ship.r - far);
  if (craft.bonkRest > 0) return;
  craft.bonkRest = BONK_REST;
  events.push({ kind: "bonk", seat: craft.seat, x: wrapped(craft.x, WIDE), y: wrapped(craft.y, TALL) });
}

export function stepCraft(craft, sky, step, events) {
  const kind = FAMILIES[craft.family];
  for (const key of ["safe", "hurt", "boost", "ringRest", "bonkRest"]) if (craft[key] > 0) craft[key] -= 1;
  if (craft.out > 0) {
    craft.out += 1;
    craft.bank = 0;
  } else if (craft.down) turn(craft, kind.turn);
  else {
    craft.bank = 0;
    if (craft.rest > 0) craft.rest -= 1;
  }
  craft.speed += (wanted(craft, kind) - craft.speed) * EASE;
  craft.x += craft.hx * craft.speed * craft.pace * DT;
  craft.y += craft.hy * craft.speed * craft.pace * DT;
  if (inWind(sky, craft)) craft.x += sky.wind.push * DT;
  if (craft.out > 0) return;
  throughRing(craft, sky.ring, events);
  roundShip(craft, sky.airship, step, events);
}
