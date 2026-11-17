import { test, beforeEach, vi } from 'vitest';
import assert from 'node:assert/strict';
import * as garage from '../src/art-garage.js';
import * as vehicles from '../src/art-vehicles.js';
import * as cars from '../src/art-cars.js';
import { drawLevelCard, levelCardBox, levelCardGoButton, levelCardGarageButton, levelCardRobotButton, VEHICLE_COLORS, PALETTE } from '../src/art.js';
import { SWITCH_BAND } from '../src/layout.js';
import { pointTracker } from './point-tracker.js';

const { spied } = vi.hoisted(() => ({
  spied: async (importOriginal) => {
    const real = await importOriginal();
    return Object.fromEntries(Object.entries(real).map(([name, value]) => [name, typeof value === 'function' ? vi.fn(value) : value]));
  },
}));
vi.mock('../src/art-garage.js', spied);
vi.mock('../src/art-vehicles.js', spied);
vi.mock('../src/art-cars.js', spied);

beforeEach(() => vi.clearAllMocks());

const STAGES = [[226, 343], [257, 390], [332, 503], [384, 760], [462, 700], [520, 853]];
const overlap = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

test('the card shows the vehicle the child chose, in its colour', () => {
  const chosen = pointTracker();
  drawLevelCard(chosen.ctx, { width: 384, height: 760, level: 3, result: 'won', vehicle: { kind: 'tractor', color: 'lavender' } });
  assert.ok(chosen.fills.includes(VEHICLE_COLORS[5].value));
  const plain = pointTracker();
  drawLevelCard(plain.ctx, { width: 384, height: 760, level: 3, result: 'won' });
  assert.ok(plain.fills.includes(PALETTE.player));
  assert.ok(!plain.fills.includes(VEHICLE_COLORS[5].value));
});

test('every card has the garage button, where its hit area says, clear of the go button', () => {
  for (const [width, height] of STAGES) {
    for (const result of ['start', 'won', 'lost']) {
      drawLevelCard(pointTracker().ctx, { width, height, level: 12, result });
      const button = levelCardGarageButton(width, height);
      const [, x, y, size] = garage.drawGarageButton.mock.calls.at(-1);
      assert.deepEqual([x, y, size / 2], [button.centerX, button.centerY, button.radius]);
      assert.ok(!overlap(button, levelCardGoButton(width, height)));
      assert.ok(button.x >= 0 && button.x + button.width <= width && button.y >= 0);
    }
  }
});

test('a long level number shrinks so that it never runs under the garage button', () => {
  for (const [width, height] of STAGES) {
    for (const level of [1, 12, 123, 4567]) {
      const { ctx } = pointTracker();
      const text = [];
      ctx.measureText = (value) => ({ width: value.length * 0.62 * Number(/(\d+(\.\d+)?)px/.exec(ctx.font)[1]) });
      ctx.fillText = (value, x) => text.push({ value, x, width: ctx.measureText(value).width });
      drawLevelCard(ctx, { width, height, level, result: 'start' });
      const [number] = text;
      const button = levelCardGarageButton(width, height);
      assert.ok(number.x + number.width / 2 <= button.x - 8, `${width}x${height} level ${level}: ${JSON.stringify(number)}`);
      assert.ok(number.x - number.width / 2 >= (width - Math.min(width - 36, 340)) / 2 + 8, `${width}x${height} level ${level}`);
    }
  }
});

test('the garage button is a big target where the card has room, and carries the vehicle being driven', () => {
  for (const [width, height] of STAGES) {
    const button = levelCardGarageButton(width, height);
    assert.ok(button.width >= 64, `${width}x${height}`);
    if (Math.min(width - 36, 340) >= 284) assert.ok(button.width + 28 >= 96, `${width}x${height}: ${button.width}`);
  }
  drawLevelCard(pointTracker().ctx, { width: 384, height: 760, level: 1, result: 'start', time: 0.3, vehicle: { kind: 'bus', color: 'mint' }, garageHint: true });
  assert.deepEqual(garage.drawGarageButton.mock.calls.at(-1)[4], { kind: 'bus', color: 'mint', time: 0.3, wiggle: true });
  drawLevelCard(pointTracker().ctx, { width: 384, height: 760, level: 1, result: 'start', time: 0.3 });
  assert.equal(garage.drawGarageButton.mock.calls.at(-1)[4].wiggle, false);
});

test('the go button never covers the two racers, even on the small card in a chat', () => {
  for (const [width, height] of STAGES) {
    for (const result of ['start', 'won', 'lost']) {
      vi.clearAllMocks();
      drawLevelCard(pointTracker().ctx, { width, height, level: 3, result });
      const go = levelCardGoButton(width, height);
      const player = vehicles.drawPlayerVehicle.mock.calls.find((call) => call[5]?.steer === 0.15);
      const [robot] = cars.drawRobotCar.mock.calls;
      for (const [, , y, , length] of [player, robot]) assert.ok(y + length / 2 <= go.y - 2, `${width}x${height} ${result}: racer bottom ${y + length / 2}, go top ${go.y}`);
    }
  }
});

test('even a card squeezed very small while the frame settles never asks the canvas for a negative size', () => {
  for (const [width, height] of [[100, 100], [226, 150], [300, 160], [158, 240]]) {
    for (const result of ['start', 'won', 'lost']) {
      const radii = [];
      const ctx = new Proxy({ measureText: () => ({ width: 10 }) }, {
        get: (target, name) => (name === 'ellipse' ? (x, y, radiusX, radiusY) => radii.push(radiusX, radiusY) : target[name] ?? (() => {})),
        set: (target, name, value) => {
          target[name] = value;
          return true;
        },
      });
      drawLevelCard(ctx, { width, height, level: 1, result, time: 0.4 });
      assert.ok(radii.every((radius) => radius >= 0), `${width}x${height} ${result}`);
    }
  }
});

test('with a friend the card shows the friend\'s vehicle instead of the robot', () => {
  drawLevelCard(pointTracker().ctx, { width: 384, height: 760, level: 2, result: 'start', vehicle: { kind: 'car' }, rival: { vehicle: { kind: 'rocket', color: 'mint' }, status: 'ready' } });
  const drawn = vehicles.drawPlayerVehicle.mock.calls.map((call) => call[5]?.kind);
  assert.ok(drawn.includes('rocket'));
  assert.equal(cars.drawRobotCar.mock.calls.length, 0);
  vi.clearAllMocks();
  drawLevelCard(pointTracker().ctx, { width: 384, height: 760, level: 2, result: 'start' });
  assert.equal(cars.drawRobotCar.mock.calls.length, 1);
});

test('while the friend is not there yet their place is kept empty, without a robot', () => {
  for (const status of ['unknown', 'calling', 'asleep', 'gone']) {
    vi.clearAllMocks();
    const { ctx, points } = pointTracker();
    drawLevelCard(ctx, { width: 384, height: 760, level: 2, result: 'start', time: 0.4, rival: { vehicle: null, status } });
    assert.equal(cars.drawRobotCar.mock.calls.length, 0, status);
    assert.equal(vehicles.drawPlayerVehicle.mock.calls.filter((call) => call[5]?.steer === 0.15).length, 1, status);
    assert.ok(points.length > 0);
  }
});

test('coming second gets its own happy card, with confetti, never a sad one', () => {
  const second = pointTracker();
  drawLevelCard(second.ctx, { width: 384, height: 760, level: 2, result: 'second', time: 1, rival: { vehicle: { kind: 'bus' }, status: 'here' } });
  const start = pointTracker();
  drawLevelCard(start.ctx, { width: 384, height: 760, level: 2, result: 'start', time: 1, rival: { vehicle: { kind: 'bus' }, status: 'here' } });
  assert.ok(second.fills.includes(PALETTE.trophy) || second.fills.includes(PALETTE.star));
  const won = pointTracker();
  drawLevelCard(won.ctx, { width: 384, height: 760, level: 2, result: 'won', time: 1, rival: { vehicle: { kind: 'bus' }, status: 'here' } });
  assert.ok(second.fills.length > start.fills.length + 15);
  assert.ok(Math.abs(second.fills.length - won.fills.length) <= 3);
});

test('when the friend left their empty place carries a red cross, as a friend who is ready carries a green tick', () => {
  const card = (status) => {
    const tracked = pointTracker();
    drawLevelCard(tracked.ctx, { width: 384, height: 760, level: 2, result: 'start', time: 0.4, offerRobot: true, rival: { vehicle: null, status } });
    return tracked.fills;
  };
  const reds = (fills) => fills.filter((fill) => fill === PALETTE.trafficRed).length;
  const gone = card('gone');
  const asleep = card('asleep');
  assert.equal(reds(gone), reds(asleep) + 1);
  assert.equal(gone.length, asleep.length + 1);
});

test('when the friend is gone the card offers the robot with a button of its own, clear of the others', () => {
  for (const [width, height] of STAGES) {
    vi.clearAllMocks();
    drawLevelCard(pointTracker().ctx, { width, height, level: 12, result: 'start', offerRobot: true, rival: { vehicle: null, status: 'gone' } });
    const robot = levelCardRobotButton(width, height);
    assert.ok(cars.drawRobotCar.mock.calls.some(([, x, y]) => Math.abs(x - robot.centerX) < 1 && Math.abs(y - robot.centerY) < 1), `${width}x${height}`);
    for (const other of [levelCardGarageButton(width, height), levelCardGoButton(width, height)]) assert.ok(!overlap(robot, other), `${width}x${height}`);
    assert.ok(robot.x >= 0 && robot.width >= 64);
  }
  vi.clearAllMocks();
  drawLevelCard(pointTracker().ctx, { width: 384, height: 760, level: 2, result: 'start', rival: { vehicle: null, status: 'gone' } });
  assert.equal(cars.drawRobotCar.mock.calls.length, 0);
});

test('the level number stays between the robot button and the garage button', () => {
  for (const [width, height] of STAGES) {
    const { ctx } = pointTracker();
    const text = [];
    ctx.measureText = (value) => ({ width: value.length * 0.62 * Number(/(\d+(\.\d+)?)px/.exec(ctx.font)[1]) });
    ctx.fillText = (value, x) => text.push({ value, x, width: ctx.measureText(value).width });
    drawLevelCard(ctx, { width, height, level: 12, result: 'start', offerRobot: true, rival: { vehicle: null, status: 'gone' } });
    const [number] = text;
    const robot = levelCardRobotButton(width, height);
    assert.ok(number.x - number.width / 2 >= robot.x + robot.width + 8, `${width}x${height}: ${JSON.stringify(number)}`);
    assert.ok(number.x + number.width / 2 <= levelCardGarageButton(width, height).x - 8, `${width}x${height}`);
  }
});

test('the card and its buttons leave the top band to the sound and music buttons', () => {
  for (const [width, height] of STAGES) {
    assert.ok(levelCardBox(width, height).y >= SWITCH_BAND, `${width}x${height}`);
    assert.ok(levelCardGarageButton(width, height).y >= SWITCH_BAND, `${width}x${height}`);
    assert.ok(levelCardRobotButton(width, height).y >= SWITCH_BAND, `${width}x${height}`);
  }
});
