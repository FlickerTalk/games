import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createCar, driveCar, overlaps, crash, separate } from '../src/cars.js';
import { BUMP, DRIVING, ROAD_HALF_WIDTH, SIZES } from '../src/tuning.js';

const frame = 1 / 60;
const still = { accelerate: false, steer: 0, targetX: null };

function drive(car, input, seconds, topSpeed = 10) {
  for (let t = 0; t < seconds; t += frame) driveCar(car, input, topSpeed, frame);
}

function cone(x, distance) {
  return { kind: 'cone', x, distance, width: 0.5, length: 0.5 };
}

test('holding accelerate speeds the car up to its top speed and no further', () => {
  const car = createCar({ kind: 'player', x: 0 });
  drive(car, { ...still, accelerate: true }, 10);
  assert.equal(car.speed, 10);
  assert.ok(car.distance > 50);
});

test('releasing accelerate lets the car coast down to a stop', () => {
  const car = createCar({ kind: 'player', x: 0 });
  car.speed = 8;
  drive(car, still, 6);
  assert.equal(car.speed, 0);
  assert.ok(car.distance > 5);
});

test('steering moves the car sideways and stops at the edge of the road', () => {
  const car = createCar({ kind: 'player', x: 0 });
  car.speed = 10;
  drive(car, { ...still, steer: 1 }, 3);
  assert.equal(car.x, ROAD_HALF_WIDTH - car.width / 2);
  drive(car, { ...still, steer: -0.5 }, 0.2);
  assert.ok(car.x < ROAD_HALF_WIDTH - car.width / 2);
});

test('a target position pulls the car towards it', () => {
  const car = createCar({ kind: 'player', x: 0 });
  car.speed = 10;
  drive(car, { ...still, targetX: 2 }, 2);
  assert.ok(Math.abs(car.x - 2) < 0.05);
});

test('overlapping shapes are detected and distant ones are not', () => {
  const car = createCar({ kind: 'player', x: 0, distance: 10 });
  assert.equal(overlaps(car, cone(0.3, 10.5)), true);
  assert.equal(overlaps(car, cone(1.5, 10)), false);
  assert.equal(overlaps(car, cone(0, 14)), false);
});

test('a crash slows the car hard, makes it flash and knocks the cone away', () => {
  const car = createCar({ kind: 'player', x: 0, distance: 10 });
  car.speed = 10;
  const hit = cone(0, 10.4);
  assert.equal(crash(car, [hit]), hit);
  assert.equal(car.speed, 10 * BUMP.speedFactor);
  assert.ok(car.bumpTimer > 0);
  assert.equal(hit.knocked, true);
  drive(car, still, BUMP.seconds + 0.1);
  assert.equal(car.bumpTimer, 0);
  assert.equal(crash(car, [hit]), null);
});

test('a flashing car is not bumped again', () => {
  const car = createCar({ kind: 'player', x: 0, distance: 10 });
  car.speed = 10;
  crash(car, [cone(0, 10)]);
  const speedAfterFirst = car.speed;
  assert.equal(crash(car, [cone(0, 10.2)]), null);
  assert.equal(car.speed, speedAfterFirst);
});

test('a puddle slows the car less than a solid obstacle', () => {
  const car = createCar({ kind: 'player', x: 0, distance: 10 });
  car.speed = 10;
  crash(car, [{ kind: 'puddle', x: 0, distance: 10, width: 1.3, length: 0.9 }]);
  assert.equal(car.speed, 10 * BUMP.puddleSpeedFactor);
});

test('running into the back of a car leaves you behind it', () => {
  const car = createCar({ kind: 'player', x: 0, distance: 9.5 });
  car.speed = 10;
  const slow = createCar({ kind: 'traffic', x: 0, distance: 10 });
  crash(car, [slow]);
  assert.ok(car.distance <= slow.distance - (car.length + slow.length) / 2);
});

test('two cars side by side are pushed apart', () => {
  const left = createCar({ kind: 'player', x: -0.2, distance: 5 });
  const right = createCar({ kind: 'robot', x: 0.2, distance: 5 });
  separate(left, right);
  assert.equal(overlaps(left, right), false);
  assert.ok(left.x < -0.2 && right.x > 0.2);
});

test('the player and the robot never look as if they drive through each other', () => {
  const player = createCar({ kind: 'player', x: 0, distance: 5 });
  const robot = createCar({ kind: 'robot', x: 0.8, distance: 5.6 });
  separate(player, robot);
  const gap = robot.x - player.x;
  assert.ok(gap >= (player.width + robot.width) / 2, `gap ${gap}`);
});

test('the player and the robot each have their own size', () => {
  const player = createCar({ kind: 'player', x: 0 });
  const robot = createCar({ kind: 'robot', x: 0 });
  assert.deepEqual([player.width, player.length], [SIZES.player.width, SIZES.player.length]);
  assert.deepEqual([robot.width, robot.length], [SIZES.robot.width, SIZES.robot.length]);
});

test('a car remembers which way and how hard it is steering', () => {
  const car = createCar({ kind: 'player', x: 0 });
  car.speed = 10;
  drive(car, { ...still, steer: 0.5 }, 0.1);
  assert.ok(Math.abs(car.steer - 0.5) < 1e-9);
  drive(car, { ...still, targetX: -3 }, 0.1);
  assert.equal(car.steer, -1);
  drive(car, still, 0.1);
  assert.equal(car.steer, 0);
  assert.ok(DRIVING.lateralSpeed > 0);
});
