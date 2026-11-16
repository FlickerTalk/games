import { BALLOONS, TALL, WIDE, apart, hidden, skyOf, wrapped } from "./arena.js";
import { HURT, OUT_SHOW, SAFE, createCraft, stepCraft } from "./craft.js";

// steps of 1/120 s the hunter must stay on the tail
export const LOCK = 110;
// sky widths
export const RANGE = 0.42;
const TOUCHING = 0.02;
// cosines: how straight the hunter points at its prey, and how squarely it sits behind it
const POINTING = 0.92;
const BEHIND = -0.3;
const OPENING = 2;
// a slower aircraft is easier to aim at: the ring closes faster on it
const SWIFT = 0.5;
const EASIER = 8;
// steps of its own flight an aircraft remembers, to judge a hunter the phone sees late
export const TRAIL = 100;
const OTHER = ["x", "y", "hx", "hy", "speed", "lock", "safe", "out", "boost", "rest", "bank", "down", "family"];

export function createMatch({ seed, twists, roundSteps, families = ["plane", "plane"] }) {
  return {
    seed, roundSteps, step: 0, over: false,
    sky: skyOf(seed, twists),
    crafts: [createCraft(0, families[0]), createCraft(1, families[1])],
    trails: [[], []],
  };
}

export const scoreOf = (match, seat) => Math.min(BALLOONS, match.crafts[1 - seat].lost);

export const balloonsOf = (match, seat) => BALLOONS - Math.min(BALLOONS, match.crafts[seat].lost);

export function onTail(match, hunter, prey) {
  if (hunter.out > 0 || prey.out > 0 || prey.safe > 0 || hidden(match.sky, prey)) return false;
  const { dx, dy, far } = apart(hunter, prey);
  if (far > RANGE || far < TOUCHING) return false;
  const pointing = (hunter.hx * dx + hunter.hy * dy) / far;
  const behind = (prey.hx * dx + prey.hy * dy) / far;
  return pointing >= POINTING && behind >= BEHIND;
}

export const closing = (prey) => 1 + Math.max(0, SWIFT - prey.speed * prey.pace) * EASIER;

const placeOf = (craft) => ({ x: wrapped(craft.x, WIDE), y: wrapped(craft.y, TALL) });

function popped(prey, hunter) {
  return { kind: "pop", seat: prey.seat, by: hunter.seat, left: BALLOONS - Math.min(BALLOONS, prey.lost), ...placeOf(prey), from: placeOf(hunter) };
}

export function seenBy(match, seat, rewind) {
  const craft = match.crafts[seat];
  const trail = match.trails[seat];
  const past = rewind > 0 ? trail[Math.max(0, trail.length - 1 - Math.round(rewind))] : null;
  return past ? { ...craft, x: past[0], y: past[1], hx: past[2], hy: past[3] } : craft;
}

function remember(match, craft) {
  const trail = match.trails[craft.seat];
  trail.push([craft.x, craft.y, craft.hx, craft.hy]);
  if (trail.length > TRAIL + 1) trail.shift();
}

function judge(match, prey, hunter, events, rewind) {
  if (!onTail(match, hunter, seenBy(match, prey.seat, rewind))) {
    prey.lock = Math.max(0, prey.lock - OPENING);
    return;
  }
  prey.lock += closing(prey);
  if (prey.lock < LOCK) return;
  Object.assign(prey, { lock: 0, lost: prey.lost + 1, safe: SAFE, hurt: HURT });
  if (prey.lost >= BALLOONS) prey.out = 1;
  events.push(popped(prey, hunter));
}

function checkOver(match) {
  if (match.step >= match.roundSteps || match.crafts.some((craft) => craft.out >= OUT_SHOW)) match.over = true;
}

// rewind: how many steps ago the other phone's hunter aimed at what this phone judges now
export function stepMatch(match, own, rewind = 0) {
  if (match.over) return [];
  const events = [];
  match.step += 1;
  match.crafts.forEach((craft, seat) => {
    if (!own[seat]) return;
    if (match.trails[seat].length === 0) remember(match, craft);
    stepCraft(craft, match.sky, match.step, events);
    remember(match, craft);
  });
  match.crafts.forEach((craft, seat) => {
    if (own[seat]) judge(match, craft, match.crafts[1 - seat], events, own[1 - seat] ? 0 : rewind);
  });
  checkOver(match);
  return events;
}

export function placeOther(match, seat, fields) {
  const craft = match.crafts[seat];
  for (const key of OTHER) if (fields[key] !== undefined) craft[key] = fields[key];
}

export function learnLost(match, seat, lost) {
  const craft = match.crafts[seat];
  if (!Number.isInteger(lost) || lost <= craft.lost) return [];
  craft.lost = lost;
  craft.hurt = HURT;
  return [popped(craft, match.crafts[1 - seat])];
}
