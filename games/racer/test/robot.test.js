import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createBrain, robotInput, clearPathX, steerTraffic } from '../src/robot.js';
import { createCar } from '../src/cars.js';
import { createRandom } from '../src/random.js';
import { laneCenters } from '../src/track.js';

function cone(x, distance) {
  return { kind: 'cone', x, distance, width: 0.5, length: 0.5, knocked: false };
}

function carefulBrain() {
  return createBrain(createRandom(1), 0);
}

test('on an empty road the robot keeps its line and keeps accelerating', () => {
  const robot = createCar({ kind: 'robot', x: 0.3, distance: 0 });
  const input = robotInput(robot, carefulBrain(), []);
  assert.equal(input.accelerate, true);
  assert.equal(input.targetX, 0.3);
});

test('the robot swerves to a free lane when something blocks its path', () => {
  const robot = createCar({ kind: 'robot', x: 0, distance: 0 });
  const { targetX } = robotInput(robot, carefulBrain(), [cone(0, 8)]);
  assert.ok(targetX === laneCenters[0] || targetX === laneCenters[2]);
});

test('the robot never swerves into another blocked lane', () => {
  const robot = createCar({ kind: 'robot', x: 0, distance: 0 });
  const { targetX } = robotInput(robot, carefulBrain(), [cone(0, 6), cone(laneCenters[0], 7)]);
  assert.equal(targetX, laneCenters[2]);
});

test('a careless robot sometimes drives straight into what it should avoid', () => {
  const robot = createCar({ kind: 'robot', x: 0, distance: 0 });
  const careless = createBrain(createRandom(1), 1);
  assert.equal(robotInput(robot, careless, [cone(0, 8)]).targetX, 0);
});

test('the robot decides once per obstacle and sticks to it', () => {
  const robot = createCar({ kind: 'robot', x: 0, distance: 0 });
  const brain = createBrain(createRandom(9), 0.5);
  const ahead = cone(0, 8);
  const first = robotInput(robot, brain, [ahead]).targetX;
  for (let i = 0; i < 30; i += 1) assert.equal(robotInput(robot, brain, [ahead]).targetX, first);
});

test('things behind or far ahead do not make the robot swerve', () => {
  const robot = createCar({ kind: 'robot', x: 0, distance: 50 });
  assert.equal(clearPathX(robot, [cone(0, 40), cone(0, 90)], 14), 0);
});

test('traffic changes lane to get around a hazard', () => {
  const car = { kind: 'traffic', x: 0, distance: 20, width: 0.9, length: 1.6, speed: 4 };
  const hazards = [cone(0, 25)];
  for (let i = 0; i < 90; i += 1) steerTraffic(car, hazards, 1 / 60);
  assert.ok(Math.abs(car.x) > 1);
});

test('traffic leans the way it changes lane, and straightens once there', () => {
  const car = { kind: 'traffic', x: 0.3, distance: 20, width: 0.9, length: 1.6, speed: 4 };
  const hazards = [cone(0.3, 25)];
  steerTraffic(car, hazards, 1 / 60);
  assert.ok(car.steer > 0.5, `${car.steer}`);
  for (let i = 0; i < 300; i += 1) steerTraffic(car, hazards, 1 / 60);
  assert.equal(car.steer, 0);
});
