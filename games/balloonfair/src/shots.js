// steps of 1/40 s
export const RELOAD = Object.freeze({ popgun: 10, blaster: 64, bow: 0 });
export const FLIGHT = 5;
export const JAM = 40;
// px
export const MIN_PULL = 18;
const FINGER = 30;
const SPLASH = 0.27;
const SPLASH_STAYS = 14;
const ARROW_SPEED = 0.07;
const FULL_PULL = 0.3;
const LEAST_UP = 0.3;
const PAST = 24;

export const newTool = (kind) => ({ kind, readyAt: 0, jamUntil: 0, firedAt: -1000, shots: [] });

const ready = (tool, step) => step >= tool.readyAt && step >= tool.jamUntil;

export const tankOf = (tool, step) => (tool.kind === "blaster" ? Math.min(1, Math.max(0, 1 - (tool.readyAt - step) / RELOAD.blaster)) : 1);

function nearest(seen, at) {
  let found = null;
  let least = Infinity;
  for (const one of seen) {
    const gap = Math.hypot(one.x - at.x, one.y - at.y);
    if (gap <= Math.max(one.r, FINGER) && gap < least) [found, least] = [one, gap];
  }
  return found;
}

export function fire(tool, { step, from, at, seen, unit }) {
  if (tool.kind === "bow" || !ready(tool, step)) return null;
  const shot = tool.kind === "blaster"
    ? { tool: "blaster", x: at.x, y: at.y, radius: SPLASH * unit, start: step, arrive: step + FLIGHT, until: step + FLIGHT + SPLASH_STAYS, landed: false }
    : { tool: "popgun", x0: from.x, y0: from.y, x: at.x, y: at.y, start: step, arrive: step + FLIGHT, target: nearest(seen, at)?.balloon.id ?? null };
  tool.shots.push(shot);
  tool.readyAt = step + RELOAD[tool.kind];
  tool.firedAt = step;
  return shot;
}

export function aimOf({ dx, dy }, unit) {
  const length = Math.hypot(dx, dy);
  if (length < MIN_PULL) return null;
  let [x, y] = [-dx / length, -dy / length];
  if (y > -LEAST_UP) [x, y] = [(x < 0 ? -1 : 1) * Math.sqrt(1 - LEAST_UP * LEAST_UP), -LEAST_UP];
  return { dx: x, dy: y, pull: Math.min(1, length / (FULL_PULL * unit)) };
}

export function loose(tool, { step, from, pull, unit }) {
  const aim = aimOf(pull, unit);
  if (!aim || !ready(tool, step) || tool.shots.length) return null;
  const shot = { tool: "bow", x: from.x, y: from.y, dx: aim.dx, dy: aim.dy, speed: ARROW_SPEED * unit, start: step, met: [] };
  tool.shots.push(shot);
  tool.firedAt = step;
  return shot;
}

const touched = (tool, one, step) => {
  if (one.balloon.kind !== "cloud") return { kind: "hit", id: one.balloon.id, tool: tool.kind };
  tool.jamUntil = step + JAM;
  return { kind: "puff", id: one.balloon.id, tool: tool.kind };
};

function corkLands(tool, shot, step, seen) {
  const found = shot.target === null ? null : seen.find((one) => one.balloon.id === shot.target);
  return [found ? touched(tool, found, step) : { kind: "miss", x: shot.x, y: shot.y }];
}

function splashLands(tool, shot, step, seen) {
  shot.landed = true;
  const inside = seen.filter((one) => Math.hypot(one.x - shot.x, one.y - shot.y) <= shot.radius + one.r * 0.3);
  return inside.map((one) => touched(tool, one, step));
}

function alongArrow(shot, one) {
  const [px, py] = [one.x - shot.x, one.y - shot.y];
  const along = Math.min(shot.speed, Math.max(0, px * shot.dx + py * shot.dy));
  const gap = Math.hypot(px - shot.dx * along, py - shot.dy * along);
  return gap <= one.r * 0.7 + 4 ? along : null;
}

function arrowFlies(tool, shot, step, seen) {
  const met = seen
    .filter((one) => !shot.met.includes(one.balloon.id))
    .map((one) => ({ one, along: alongArrow(shot, one) }))
    .filter(({ along }) => along !== null)
    .sort((one, two) => one.along - two.along);
  shot.met.push(...met.map(({ one }) => one.balloon.id));
  shot.x += shot.dx * shot.speed;
  shot.y += shot.dy * shot.speed;
  return met.map(({ one }) => touched(tool, one, step));
}

const gone = (shot, bounds) => shot.y < bounds.y - PAST || shot.x < bounds.x - PAST || shot.x > bounds.x + bounds.w + PAST;

export function stepShots(tool, { step, seen, bounds }) {
  const events = [];
  const kept = [];
  for (const shot of tool.shots) {
    if (shot.tool === "popgun") {
      if (step < shot.arrive) kept.push(shot);
      else events.push(...corkLands(tool, shot, step, seen));
    } else if (shot.tool === "blaster") {
      if (step >= shot.arrive && !shot.landed) events.push(...splashLands(tool, shot, step, seen));
      if (step < shot.until) kept.push(shot);
    } else {
      events.push(...arrowFlies(tool, shot, step, seen));
      if (!gone(shot, bounds)) kept.push(shot);
      else if (!shot.met.length) events.push({ kind: "miss", x: Math.min(bounds.x + bounds.w, Math.max(bounds.x, shot.x)), y: Math.max(bounds.y, shot.y) });
    }
  }
  tool.shots = kept;
  return events;
}
