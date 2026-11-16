import { BUMP, DRIVING, SIZES } from './tuning.js';
import { clampToRoad } from './track.js';

const FORGIVENESS = 0.85;

export function createCar({ kind, x, distance = 0 }) {
  return { kind, x, distance, speed: 0, steer: 0, ...SIZES[kind], bumpTimer: 0 };
}

export function driveCar(car, input, topSpeed, dt) {
  car.speed = nextSpeed(car.speed, input.accelerate, topSpeed, dt);
  const grip = DRIVING.slowSteerFactor + (1 - DRIVING.slowSteerFactor) * Math.min(1, car.speed / topSpeed);
  const sideways = lateralSpeed(car, input);
  car.steer = sideways / DRIVING.lateralSpeed;
  car.x = clampToRoad(car.x + sideways * grip * dt, car.width / 2);
  car.distance += car.speed * dt;
  car.bumpTimer = Math.max(0, car.bumpTimer - dt);
}

function nextSpeed(speed, accelerate, topSpeed, dt) {
  if (accelerate) return Math.min(topSpeed, speed + DRIVING.acceleration * dt);
  return Math.max(0, speed - DRIVING.coastDeceleration * dt);
}

function lateralSpeed(car, { steer, targetX }) {
  if (targetX !== null && targetX !== undefined) {
    const wanted = (targetX - car.x) * DRIVING.followRate;
    return Math.max(-DRIVING.lateralSpeed, Math.min(DRIVING.lateralSpeed, wanted));
  }
  return (steer || 0) * DRIVING.lateralSpeed;
}

export function overlaps(a, b) {
  return Math.abs(a.x - b.x) < ((a.width + b.width) / 2) * FORGIVENESS
    && Math.abs(a.distance - b.distance) < ((a.length + b.length) / 2) * FORGIVENESS;
}

export function crash(car, obstacles) {
  if (car.bumpTimer > 0) return null;
  const hit = obstacles.find((thing) => thing !== car && !thing.knocked && overlaps(car, thing));
  if (!hit) return null;
  car.speed *= hit.kind === 'puddle' ? BUMP.puddleSpeedFactor : BUMP.speedFactor;
  car.bumpTimer = BUMP.seconds;
  if (hit.kind === 'cone') knockAway(hit, car);
  if (hit.kind === 'traffic' && car.distance < hit.distance) {
    car.distance = Math.min(car.distance, hit.distance - (car.length + hit.length) / 2);
  }
  return hit;
}

function knockAway(cone, car) {
  cone.knocked = true;
  cone.knockDirection = cone.x >= car.x ? 1 : -1;
}

export function separate(a, b) {
  const sideOverlap = (a.width + b.width) / 2 - Math.abs(a.x - b.x);
  const alongside = Math.abs(a.distance - b.distance) < (a.length + b.length) / 2;
  if (sideOverlap <= 0 || !alongside) return;
  const direction = a.x <= b.x ? -1 : 1;
  const push = sideOverlap / 2 + 0.01;
  a.x = clampToRoad(a.x + direction * push, a.width / 2);
  b.x = clampToRoad(b.x - direction * push, b.width / 2);
}
