import { test } from 'vitest';
import assert from 'node:assert/strict';
import { VEHICLE_KINDS, VEHICLE_COLORS, drawPlayerVehicle, drawPlayerCar, drawProgressStrip, PALETTE, hasFixedColor, vehicleTint } from '../src/art.js';
import { pointTracker, bounds } from './point-tracker.js';

const WIDTH = 59;
const HEIGHT = 94;

test('eleven vehicles are offered, the car first and the five everyday ones next', () => {
  assert.deepEqual(VEHICLE_KINDS.slice(0, 5), ['car', 'motorbike', 'kart', 'truck', 'bus']);
  assert.equal(VEHICLE_KINDS.length, 11);
  assert.equal(new Set(VEHICLE_KINDS).size, 11);
  assert.equal(VEHICLE_COLORS.length, 6);
  assert.equal(VEHICLE_COLORS[0].value, PALETTE.player);
});

test('every vehicle stays inside the box the race gives the player', () => {
  for (const kind of VEHICLE_KINDS) {
    for (const braking of [false, true]) {
      const { ctx, points } = pointTracker();
      drawPlayerVehicle(ctx, 100, 200, WIDTH, HEIGHT, { kind, color: 'ocean', braking, time: 0.3 });
      const edge = bounds(points);
      const slack = WIDTH * 0.06;
      assert.ok(edge.left >= 100 - WIDTH / 2 - slack && edge.right <= 100 + WIDTH / 2 + slack, `${kind}: ${JSON.stringify(edge)}`);
      assert.ok(edge.top >= 200 - HEIGHT / 2 - slack && edge.bottom <= 200 + HEIGHT / 2 + slack, `${kind}: ${JSON.stringify(edge)}`);
    }
  }
});

test('the colour chosen paints the body, except the police car and the fire engine', () => {
  for (const kind of VEHICLE_KINDS) {
    const { ctx, fills } = pointTracker();
    drawPlayerVehicle(ctx, 100, 200, WIDTH, HEIGHT, { kind, color: 'lavender' });
    const painted = fills.includes(VEHICLE_COLORS[5].value);
    assert.equal(painted, !['police', 'firetruck'].includes(kind), kind);
  }
});

test('an unknown vehicle is drawn as the car', () => {
  const unknown = pointTracker();
  const car = pointTracker();
  drawPlayerVehicle(unknown.ctx, 100, 200, WIDTH, HEIGHT, { kind: 'spaceship' });
  drawPlayerCar(car.ctx, 100, 200, WIDTH, HEIGHT);
  assert.deepEqual(unknown.points, car.points);
  assert.deepEqual(unknown.fills, car.fills);
});

test('the progress strip shows the chosen vehicle and paints its line in the same colour', () => {
  const chosen = pointTracker();
  drawProgressStrip(chosen.ctx, 10, 10, 280, 58, { player: 0.4, robot: 0.3 }, { kind: 'kart', color: 'lavender' });
  assert.ok(chosen.fills.includes(VEHICLE_COLORS[5].value));
  const strokes = [];
  const watched = pointTracker();
  const ctx = new Proxy(watched.ctx, {
    get: (target, name) => (name === 'stroke' ? () => strokes.push(target.strokeStyle) : target[name]),
    set: (target, name, value) => {
      target[name] = value;
      return true;
    },
  });
  drawProgressStrip(ctx, 10, 10, 280, 58, { player: 0.4, robot: 0.3 }, { kind: 'kart', color: 'mint' });
  assert.ok(strokes.includes(VEHICLE_COLORS[3].value));
  assert.ok(!strokes.includes(PALETTE.player));
});

test('the motorbike has one tail light, drawn once', () => {
  for (const braking of [false, true]) {
    const { ctx, fills } = pointTracker();
    drawPlayerVehicle(ctx, 100, 200, WIDTH, HEIGHT, { kind: 'motorbike', braking });
    assert.equal(fills.filter((fill) => fill === PALETTE.trafficRed).length, braking ? 2 : 1);
  }
});

test('the police car and the fire engine keep their own colour wherever the chosen colour would show', () => {
  assert.deepEqual(VEHICLE_KINDS.filter(hasFixedColor), ['police', 'firetruck']);
  assert.equal(vehicleTint('police', 'mint'), PALETTE.city);
  assert.equal(vehicleTint('firetruck', 'mint'), PALETTE.trafficRed);
  assert.equal(vehicleTint('bus', 'mint'), VEHICLE_COLORS[3].value);
  const strokes = [];
  const watched = pointTracker();
  const ctx = new Proxy(watched.ctx, {
    get: (target, name) => (name === 'stroke' ? () => strokes.push(target.strokeStyle) : target[name]),
    set: (target, name, value) => {
      target[name] = value;
      return true;
    },
  });
  drawProgressStrip(ctx, 10, 10, 280, 58, { player: 0.4, robot: 0.3 }, { kind: 'police', color: 'mint' });
  assert.ok(strokes.includes(PALETTE.city));
  assert.ok(!strokes.includes(VEHICLE_COLORS[3].value));
});

test('in a race with a friend the strip shows the friend\'s vehicle and colour in place of the robot', () => {
  const { ctx, fills } = pointTracker();
  drawProgressStrip(ctx, 10, 10, 280, 58, { player: 0.4, robot: 0.3 }, { kind: 'car' }, { kind: 'kart', color: 'lavender' });
  assert.ok(fills.includes(VEHICLE_COLORS[5].value));
  assert.ok(!fills.includes(PALETTE.robot));
});
