// v of the row the crafts fly on
export const CRAFT_V = 0.88;
// steps
export const FIRE_EVERY = 20;
export const CAUGHT_MOST = 240;
export const SAFE = 70;
// field heights and widths a step
export const BOLT_SPEED = 0.036;
export const TURN = 0.028;

const EDGE = 0.06;
const MUZZLE = 0.06;
const SEATS = [0.32, 0.68];
// in craft sizes
const CATCH = 0.34;
const FREE = 0.8;
const JOIN = 1.3;

export const newCraft = (seat) => ({ seat, u: SEATS[seat], want: SEATS[seat], bank: 0, caught: 0, safe: 0, fireAt: 0, firedAt: -100, bolts: [] });

export function moveCraft(craft) {
  if (craft.caught > 0) {
    craft.caught -= 1;
    craft.bank = 0;
    if (craft.caught > 0) return null;
    craft.safe = SAFE;
    return "loose";
  }
  if (craft.safe > 0) craft.safe -= 1;
  const want = Math.min(1 - EDGE, Math.max(EDGE, craft.want));
  const move = Math.min(TURN, Math.max(-TURN, want - craft.u));
  craft.u = Math.abs(want - craft.u) <= TURN ? want : craft.u + move;
  craft.bank = move / TURN;
  return null;
}

export function catchCraft(craft, hazards, { w, h, craft: size }) {
  if (craft.caught > 0 || craft.safe > 0) return null;
  for (const one of hazards) {
    const [dx, dy] = [(one.u - craft.u) * w, (one.v - CRAFT_V) * h];
    const reach = size * CATCH + one.r * 0.8;
    if (dx * dx + dy * dy > reach * reach) continue;
    craft.caught = CAUGHT_MOST;
    craft.bolts = [];
    return one.key;
  }
  return null;
}

const near = (one, two, { w, craft }, sizes) => Math.abs(one.u - two.u) * w <= craft * sizes;

export function freeCraft(craft, mate, metrics) {
  if (craft.caught <= 0 || mate.caught > 0 || !near(craft, mate, metrics, FREE)) return false;
  craft.caught = 0;
  craft.safe = SAFE;
  return true;
}

export const joined = (one, two, metrics) => one.caught <= 0 && two.caught <= 0 && near(one, two, metrics, JOIN);

export function fire(craft, step, wide) {
  if (craft.caught > 0 || step < craft.fireAt) return false;
  craft.bolts.push({ u: craft.u, v: CRAFT_V - MUZZLE, wide });
  craft.fireAt = step + FIRE_EVERY;
  craft.firedAt = step;
  return true;
}

function metBy(bolt, seen, { w, h, unit }) {
  const stride = (BOLT_SPEED * h) / 2;
  for (const one of seen) {
    if (one.v < 0.02) continue;
    const reach = one.r * 0.85 + unit * (bolt.wide ? 0.08 : 0.02);
    if (Math.abs(one.u - bolt.u) * w <= reach && Math.abs(one.v - bolt.v) * h <= reach + stride) return one;
  }
  return null;
}

export function stepBolts(craft, seen, metrics) {
  const events = [];
  const kept = [];
  for (const bolt of craft.bolts) {
    bolt.v -= BOLT_SPEED;
    const met = metBy(bolt, seen, metrics);
    if (met) events.push({ kind: met.enemy.owner === null || met.enemy.owner === craft.seat ? "hit" : "block", id: met.enemy.id, u: met.u, v: met.v });
    else if (bolt.v > -0.05) kept.push(bolt);
  }
  craft.bolts = kept;
  return events;
}
