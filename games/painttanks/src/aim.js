import { ANGLES, worldOf } from "./rules.js";
import { flyShot, muzzleOf } from "./physics.js";
import { vehicleAt } from "./world.js";

export const FIRST_AIM = Object.freeze({ angle: 45, power: 60 });
export const PULL_FULL = 150;

const SHORT = 12;
const STEP = 5;
const PREVIEW = 0.32;
const POWER = [0, 99];

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const anglesFor = (torpedo) => (torpedo ? [-ANGLES.torpedo, ANGLES.torpedo] : [ANGLES.least, ANGLES.most]);

export function aimFromPull(from, to, { side, torpedo = false }) {
  const forward = (from.x - to.x) * (side === 0 ? 1 : -1);
  const up = to.y - from.y;
  const reach = Math.hypot(forward, up);
  const [low, high] = anglesFor(torpedo);
  const angle = Math.round(clamp((Math.atan2(up, Math.max(0.001, forward)) * 180) / Math.PI, low, high));
  return { angle, power: Math.round(clamp((reach / PULL_FULL) * 99, ...POWER)), short: reach < SHORT };
}

function stepped(value, way, [low, high]) {
  const now = clamp(value, low, high);
  if (way > 0) return now >= high ? low : Math.min(high, now + STEP);
  return now <= low ? high : Math.max(low, now - STEP);
}

export function stepAim(aim, kind, way, { torpedo = false } = {}) {
  if (kind === "power") return { ...aim, power: stepped(aim.power, way, POWER) };
  return { ...aim, angle: stepped(aim.angle, way, anglesFor(torpedo)) };
}

const underFor = (state, side, shot) => {
  const under = [...state.under];
  if (vehicleAt(worldOf(state), side).family === "sub") under[side] = shot.kind === "torpedo";
  return under;
};

export function anchorOf(state, side) {
  const vehicle = vehicleAt(worldOf(state), side);
  return { x: vehicle.x, y: vehicle.y - vehicle.size * (vehicle.family === "tank" ? 0.5 : 0.3) };
}

export function muzzleFor(state, side, shot) {
  return muzzleOf(vehicleAt({ ...worldOf(state), under: underFor(state, side, shot) }, side), shot);
}

export function previewOf(state, side, shot, wind = 0) {
  const world = { ...worldOf(state), under: underFor(state, side, shot) };
  const { path } = flyShot(world, side, shot, { wind, targets: [] });
  return path.slice(0, Math.max(5, Math.ceil(path.length * PREVIEW)));
}
