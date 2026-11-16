const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const STEPS = LETTERS.length - 1;

// goal coordinates: x from the left post (0) to the right one (1), y from the grass (0) up to the bar (1)
export const GOAL_RATIO = 1.65;
const AIM = { x: [-0.3, 1.3], y: [0, 1.4] };
const DIVE = { x: [0, 1], y: [0, 1] };
const POST = 0.04;
const BAR = 0.95;

// goal heights
export const REACH = Object.freeze({ blind: 0.42, pair: 0.36 });

export const BONUS = Object.freeze([Object.freeze({ kind: "tyre", x: 0.5, y: 0.8, size: 0.11 }), Object.freeze({ kind: "bells", x: 0.88, y: 0.8, size: 0.11 })]);

const clamp = (value, [low, high]) => Math.min(high, Math.max(low, Number.isFinite(value) ? value : low));
const stepOf = (value, range) => Math.round(((clamp(value, range) - range[0]) / (range[1] - range[0])) * STEPS);
const valueOf = (step, [low, high]) => Math.round((low + (step / STEPS) * (high - low)) * 10000) / 10000;

const snap = (point, ranges) => ({ x: valueOf(stepOf(point?.x, ranges.x), ranges.x), y: valueOf(stepOf(point?.y, ranges.y), ranges.y) });
const write = (point, ranges) => LETTERS[stepOf(point.x, ranges.x)] + LETTERS[stepOf(point.y, ranges.y)];

function read(text, ranges) {
  if (typeof text !== "string" || text.length !== 2) return null;
  const [x, y] = [LETTERS.indexOf(text[0]), LETTERS.indexOf(text[1])];
  return x < 0 || y < 0 ? null : { x: valueOf(x, ranges.x), y: valueOf(y, ranges.y) };
}

export const snapAim = (point) => snap(point, AIM);
export const snapDive = (point) => snap(point, DIVE);
export const aimText = (aim) => write(aim, AIM);
export const diveText = (dive) => write(dive, DIVE);
export const readAim = (text) => read(text, AIM);
export const readDive = (text) => read(text, DIVE);

export const onTarget = (aim) => aim.x >= POST && aim.x <= 1 - POST && aim.y >= 0 && aim.y <= BAR;

const apart = (one, two) => Math.hypot((one.x - two.x) * GOAL_RATIO, one.y - two.y);

export function resolveKick(aim, dive, reach) {
  if (!onTarget(aim)) return { outcome: "wide", bonus: null };
  if (dive && apart(aim, dive) <= reach) return { outcome: "saved", bonus: null };
  const hit = BONUS.find((one) => apart(aim, one) <= one.size);
  return { outcome: "goal", bonus: hit?.kind ?? null };
}
