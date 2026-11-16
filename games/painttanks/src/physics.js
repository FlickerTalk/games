import { cosine, distance, sine } from "./exact.js";
import { COAST_EDGE, WORLD, groundY, hasGround, seaOf, solidAt, vehicleAt } from "./world.js";

export const STEP = 1 / 60;
export const GRAVITY = 160;
export const BALL_RADIUS = 6;

const WIND_PUSH = 22;
const MOST_STEPS = 480;
const SAMPLE_EVERY = 2;
const OWN_GRACE = 0.3;
const DRAG = 0.9;
const SINK = 55;
const MOST_UNDER = 3;
const TORPEDO_SPEED = 150;
const SPLASH = { normal: 16, special: 30, torpedo: 22 };
const CRATER = { normal: 16, special: 26 };
const TARGET_REACH = 0.38;

export const speedOf = (power) => 60 + power * 2.2;
export const torpedoRange = (power) => 60 + power * 3.4;

const facing = (side) => (side === 0 ? 1 : -1);

export function muzzleOf(vehicle, shot) {
  const { x, y, size, family, side } = vehicle;
  const dir = facing(side);
  if (shot.kind === "torpedo") return { x: x + dir * size * 0.5, y: y + size * 0.08 };
  const [baseX, baseY, reach] = family === "tank" ? [0, 0.5, 0.48] : family === "ship" ? [0, 0.32, 0.43] : [0.05, 0.25, 0.4];
  return { x: x + dir * size * baseX + dir * cosine(shot.angle) * size * reach, y: y - size * baseY - sine(shot.angle) * size * reach };
}

function launch(world, side, shot) {
  const vehicle = vehicleAt(world, side);
  const start = muzzleOf(vehicle, shot);
  const speed = shot.kind === "torpedo" ? TORPEDO_SPEED : speedOf(shot.power);
  return { x: start.x, y: start.y, vx: facing(side) * cosine(shot.angle) * speed, vy: -sine(shot.angle) * speed };
}

export function waterAt(field, x) {
  if (field === "sea" || field === "deep") return true;
  return field === "coast" && x >= COAST_EDGE;
}

const underwater = (world, x, y) => waterAt(world.field, x) && y > seaOf(world.field) && !solidAt(world, x, y);

function vehicleHit(vehicles, ball, time, side) {
  for (const { side: other, hit } of vehicles) {
    if (other === side && time < OWN_GRACE) continue;
    if (distance(ball.x - hit.x, ball.y - hit.y) <= hit.r + BALL_RADIUS) return other;
  }
  return null;
}

function targetHit(ball, targets, struck) {
  return targets.findIndex((one, at) => !one.hit && !struck.includes(at) && distance(ball.x - one.x, ball.y - one.y) <= one.size * TARGET_REACH + BALL_RADIUS);
}

function outside(ball) {
  return ball.x < -WORLD.width * 0.5 || ball.x > WORLD.width * 1.5 || ball.y > WORLD.height + 40;
}

function move(world, ball, wind, flight) {
  if (underwater(world, ball.x, ball.y)) {
    flight.under += STEP;
    ball.vx -= ball.vx * DRAG * STEP;
    ball.vy += (SINK - ball.vy * DRAG) * STEP;
  } else {
    ball.vx += wind * WIND_PUSH * STEP;
    ball.vy += GRAVITY * STEP;
  }
  const wasAbove = !underwater(world, ball.x, ball.y);
  ball.x += ball.vx * STEP;
  ball.y += ball.vy * STEP;
  if (wasAbove && !flight.entry && underwater(world, ball.x, ball.y)) flight.entry = { x: ball.x, y: seaOf(world.field) };
}

function travelled(world, ball, flight, shot) {
  if (shot.kind !== "torpedo") return null;
  flight.distance += TORPEDO_SPEED * STEP;
  if (ball.y <= seaOf(world.field)) return "surface";
  if (flight.distance >= torpedoRange(shot.power)) return "spent";
  return null;
}

function stepOnce(world, side, shot, ball, flight, options) {
  if (shot.kind === "torpedo") {
    ball.x += ball.vx * STEP;
    ball.y += ball.vy * STEP;
  } else move(world, ball, options.wind, flight);
  const time = flight.steps * STEP;
  const painted = vehicleHit(options.vehicles, ball, time, side);
  if (painted !== null) return { kind: "vehicle", side: painted };
  const target = targetHit(ball, options.targets, flight.struck);
  if (target >= 0) {
    flight.struck.push(target);
    if (options.targets[target].kind !== "trampoline" || shot.kind === "torpedo") return { kind: "target", target };
    ball.vy = -Math.abs(ball.vy) * 0.85;
    flight.bounced = true;
  }
  const ended = travelled(world, ball, flight, shot);
  if (ended) return { kind: ended };
  if (solidAt(world, ball.x, ball.y)) return { kind: world.field === "deep" ? "floor" : "ground" };
  if (outside(ball) || flight.under > MOST_UNDER) return { kind: flight.under > MOST_UNDER ? "spent" : "out" };
  return null;
}

function splashOf(shot, special) {
  if (shot.kind === "torpedo") return SPLASH.torpedo;
  return special ? SPLASH.special : SPLASH.normal;
}

function spread(flight, end, shot, options) {
  const splashing = ["vehicle", "target", "ground", "floor", "surface"].includes(end.kind);
  const painted = end.kind === "vehicle" ? [end.side] : [];
  if (!splashing) return painted;
  const reach = splashOf(shot, options.special);
  for (const { side, hit } of options.vehicles) {
    if (!painted.includes(side) && distance(end.x - hit.x, end.y - hit.y) <= hit.r + reach) painted.push(side);
  }
  options.targets.forEach((one, at) => {
    if (!one.hit && !flight.struck.includes(at) && one.kind !== "trampoline" && distance(end.x - one.x, end.y - one.y) <= one.size * TARGET_REACH + reach) flight.struck.push(at);
  });
  return painted.sort();
}

function craterOf(world, end, special) {
  if (end.kind !== "ground") return null;
  const y = hasGround(world.field, end.x) ? Math.min(end.y, groundY(world, end.x)) : end.y;
  return { x: end.x, y, r: special ? CRATER.special : CRATER.normal };
}

export function flyShot(world, side, shot, options) {
  const vehicles = (world.practice ? [0] : [0, 1]).map((one) => vehicleAt(world, one));
  const settings = { wind: 0, targets: [], special: false, ...options, vehicles };
  const ball = launch(world, side, shot);
  const flight = { steps: 0, under: 0, distance: 0, entry: null, struck: [], bounced: false };
  const path = [[ball.x, ball.y]];
  let end = null;
  while (!end && flight.steps < MOST_STEPS) {
    flight.steps += 1;
    end = stepOnce(world, side, shot, ball, flight, settings);
    if (end || flight.steps % SAMPLE_EVERY === 0) path.push([ball.x, ball.y]);
  }
  const ending = { kind: "spent", ...end, x: ball.x, y: ball.y };
  const painted = spread(flight, ending, shot, settings);
  return {
    path,
    end: ending,
    entry: flight.entry,
    painted,
    struck: flight.struck,
    bounced: flight.bounced,
    crater: craterOf(world, ending, settings.special),
    steps: flight.steps,
    time: flight.steps * STEP,
  };
}
