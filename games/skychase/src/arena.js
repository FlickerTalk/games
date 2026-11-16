import { randomOf } from "../../../kit/src/canvas/random.js";

export const STEPS_PER_SECOND = 120;
export const STEP_MS = 1000 / STEPS_PER_SECOND;
export const DT = 1 / STEPS_PER_SECOND;

// the sky is one unit wide on every phone
export const WIDE = 1;
export const TALL = 1.4;
export const BALLOONS = 3;
export const TWISTS = Object.freeze(["clear", "clouds", "wind", "ring", "airship"]);

export const START = Object.freeze([
  Object.freeze({ x: 0.25, y: 1.05, hx: 0, hy: -1 }),
  Object.freeze({ x: 0.75, y: 0.35, hx: 0, hy: 1 }),
]);

const CLOUD = Object.freeze({ least: 0.13, more: 0.05, cover: 0.85 });
const WIND = Object.freeze({ tall: 0.24, push: 0.11 });
const RING = 0.1;
const AIRSHIP = Object.freeze({ r: 0.12, drift: 0.035 });
const TRIES = 40;

export const wrapped = (value, size) => value - Math.floor(value / size) * size;

export function gap(from, to, size) {
  const across = wrapped(to - from, size);
  return across > size / 2 ? across - size : across;
}

export function apart(from, to) {
  const dx = gap(from.x, to.x, WIDE);
  const dy = gap(from.y, to.y, TALL);
  return { dx, dy, far: Math.sqrt(dx * dx + dy * dy) };
}

function place(random, r, taken) {
  let spot = null;
  for (let tries = 0; tries < TRIES; tries += 1) {
    spot = { x: random() * WIDE, y: random() * TALL, r };
    const free = [...START.map((start) => ({ ...start, r: 0.1 })), ...taken].every((one) => apart(one, spot).far > one.r + r + 0.03);
    if (free) return spot;
  }
  return spot;
}

export function skyOf(seed, twists) {
  const random = randomOf(`${seed}/sky`);
  const level = Math.max(0, Math.min(TWISTS.length - 1, Math.round(twists)));
  const sky = { clouds: [], wind: null, ring: null, airship: null };
  const taken = [];
  const put = (r) => {
    const spot = place(random, r, taken);
    taken.push(spot);
    return spot;
  };
  if (level >= 1) sky.clouds = [0, 1, 2].slice(0, 2 + Math.floor(random() * 2)).map(() => put(CLOUD.least + random() * CLOUD.more));
  if (level >= 2) sky.wind = { y: random() * (TALL - WIND.tall), tall: WIND.tall, push: random() < 0.5 ? WIND.push : -WIND.push };
  if (level >= 3) sky.ring = put(RING);
  if (level >= 4) sky.airship = { ...put(AIRSHIP.r), drift: random() < 0.5 ? AIRSHIP.drift : -AIRSHIP.drift };
  return sky;
}

export const hidden = (sky, point) => sky.clouds.some((cloud) => apart(cloud, point).far < cloud.r * CLOUD.cover);

export const inWind = (sky, point) => Boolean(sky.wind) && wrapped(point.y - sky.wind.y, TALL) < sky.wind.tall;

export const shipAt = (airship, step) => ({ ...airship, x: wrapped(airship.x + airship.drift * step * DT, WIDE) });
