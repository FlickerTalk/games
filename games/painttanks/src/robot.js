import { flyShot } from "./physics.js";
import { ANGLES, encodeShot, windOf, worldOf } from "./rules.js";
import { familyOf, vehicleAt } from "./world.js";

const BALL_ANGLES = [30, 40, 50, 60, 70];
const POWER_STEP = 2;
const TORPEDO_ANGLES = Array.from({ length: 19 }, (_, at) => -9 + at * 3);
const SLIP = { angle: 12, power: 24, settle: 0.7 };

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

function worldFor(state, side, shot) {
  const world = worldOf(state);
  if (familyOf(state.setup.field, side, { practice: state.setup.practice }) !== "sub") return world;
  const under = [...world.under];
  under[side] = shot.kind === "torpedo";
  return { ...world, under };
}

export function missOf(state, side, shot) {
  const other = 1 - side;
  const world = worldFor(state, side, shot);
  const flight = flyShot(world, side, shot, { wind: windOf(state), targets: state.targets, special: state.special[side] });
  if (flight.painted.includes(other)) return 0;
  if (flight.painted.includes(side)) return 1000;
  const { hit } = vehicleAt(world, other);
  return Math.max(1, Math.hypot(flight.end.x - hit.x, flight.end.y - hit.y) - hit.r);
}

function candidates(torpedo) {
  if (torpedo) return TORPEDO_ANGLES.map((angle) => ({ kind: "torpedo", angle, power: 99 }));
  return BALL_ANGLES.flatMap((angle) => Array.from({ length: 50 }, (_, at) => ({ kind: "ball", angle, power: Math.min(99, at * POWER_STEP) })));
}

function bestShot(state, side, torpedo) {
  let best = null;
  for (const shot of candidates(torpedo)) {
    const miss = missOf(state, side, shot);
    if (!best || miss < best.miss) best = { shot, miss };
    if (miss === 0 && best.shot === shot) break;
  }
  return best.shot;
}

export function robotShot(state, side, { skill = 0.6, random = Math.random, tries = 0 } = {}) {
  const torpedo = familyOf(state.setup.field, side, { practice: state.setup.practice }) === "sub";
  const aimed = bestShot(state, side, torpedo);
  const spread = (1 - clamp(skill, 0, 1)) * SLIP.settle ** tries;
  const slip = (size) => (random() * 2 - 1) * spread * size;
  const angle = Math.round(aimed.angle + slip(SLIP.angle));
  const low = torpedo ? -ANGLES.torpedo : ANGLES.least;
  const high = torpedo ? ANGLES.torpedo : ANGLES.most;
  const power = torpedo ? aimed.power : Math.round(clamp(aimed.power + slip(SLIP.power), 0, 99));
  return encodeShot({ kind: aimed.kind, angle: clamp(angle, low, high), power });
}
