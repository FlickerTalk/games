import { RACE, ROBOT_PACE, SIZES } from './tuning.js';
import { clampToRoad, laneCenters } from './track.js';

const PATH_MARGIN = 0.25;

export function createBrain(random, mistakeChance) {
  return { random, mistakeChance, decisions: new Map(), laneX: null };
}

export function robotInput(robot, brain, obstacles) {
  const lookAhead = Math.max(RACE.robotLookAheadMin, robot.speed * RACE.robotLookAheadSeconds);
  const clearX = clearPathX(robot, obstacles, lookAhead, (thing) => overlooks(brain, thing));
  if (clearX !== robot.x) brain.laneX = clearX;
  return { accelerate: true, steer: 0, targetX: brain.laneX ?? robot.x };
}

export function learnFrom(brain, thing) {
  brain.decisions.set(thing, false);
}

function overlooks(brain, thing) {
  if (!brain.decisions.has(thing)) brain.decisions.set(thing, brain.random.chance(brain.mistakeChance));
  return brain.decisions.get(thing);
}

export function clearPathX(car, obstacles, lookAhead, ignore = () => false) {
  const ahead = obstacles.filter((thing) => thing !== car && !thing.knocked
    && thing.distance > car.distance - car.length
    && thing.distance - car.distance < lookAhead);
  const blocked = (x) => ahead.some((thing) => Math.abs(thing.x - x) < (thing.width + car.width) / 2 + PATH_MARGIN
    && !ignore(thing));
  if (!blocked(car.x)) return car.x;
  const nearestFirst = [...laneCenters].sort((a, b) => Math.abs(a - car.x) - Math.abs(b - car.x));
  return nearestFirst.find((x) => !blocked(x)) ?? car.x;
}

export function robotPace(gap) {
  const { evenGap, fullGap, slowest, fastest } = ROBOT_PACE;
  const share = Math.min(1, Math.max(0, (Math.abs(gap) - evenGap) / (fullGap - evenGap)));
  return 1 + share * (gap > 0 ? slowest - 1 : fastest - 1);
}

export function makeWay(car, player) {
  car.awayFromX = player.x;
}

function trafficBlockers(car, hazards) {
  if (car.awayFromX === undefined) return hazards;
  return [...hazards, { x: car.awayFromX, distance: car.distance, width: SIZES.player.width, knocked: false }];
}

export function steerTraffic(car, hazards, dt) {
  const clearX = clearPathX(car, trafficBlockers(car, hazards), RACE.trafficLookAhead);
  if (clearX !== car.x) car.laneX = clearX;
  const goal = car.laneX ?? car.x;
  const step = RACE.trafficLaneChangeSpeed * dt;
  const move = Math.max(-step, Math.min(step, goal - car.x));
  car.steer = step > 0 ? move / step : 0;
  car.x = clampToRoad(car.x + move, car.width / 2);
}
