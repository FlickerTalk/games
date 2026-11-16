import { test, beforeEach, vi } from 'vitest';
import assert from 'node:assert/strict';
import * as art from '../src/art.js';
import { drawWorld } from '../src/draw-world.js';
import { createGame, pressGo, stepGame } from '../src/game.js';

vi.mock('../src/art.js', async (importOriginal) => {
  const real = await importOriginal();
  return Object.fromEntries(Object.entries(real).map(([name, value]) => [name, typeof value === 'function' ? vi.fn(value) : value]));
});

const quiet = new Proxy({}, {
  get: (target, name) => (name in target ? target[name] : () => {}),
  set: (target, name, value) => {
    target[name] = value;
    return true;
  },
});
const view = { width: 384, height: 760, offsetX: 0, dpr: 1, scale: 38.4, zoom: 1 };

beforeEach(() => vi.clearAllMocks());

function racing(level = 1) {
  const game = createGame({ level, seed: 3 });
  pressGo(game);
  for (let t = 0; t < 3.5; t += 1 / 60) stepGame(game, { accelerate: true, steer: 0, targetX: null }, 1 / 60);
  return game;
}

const optionsOf = (spy) => spy.mock.calls.map((call) => call.at(-1));
const playerX = (game) => view.width / 2 + game.player.x * view.scale;

test('while the finger is down the player blows exhaust and the road streaks past', () => {
  const game = racing();
  game.streaks = 0.8;
  drawWorld(quiet, view, game);
  assert.ok(art.drawExhaustPuffs.mock.calls.some(([, x]) => Math.abs(x - playerX(game)) < 1));
  assert.equal(optionsOf(art.drawSpeedStreaks)[0].speed, 0.8);
  assert.equal(optionsOf(art.drawPlayerVehicle)[0].braking, false);
});

test('with the finger up the player lights its brakes, and faded streaks are not drawn', () => {
  const game = racing();
  game.player.pressing = false;
  game.player.braking = true;
  game.streaks = 0.01;
  drawWorld(quiet, view, game);
  assert.equal(optionsOf(art.drawPlayerVehicle)[0].braking, true);
  assert.equal(art.drawSpeedStreaks.mock.calls.length, 0);
  assert.ok(!art.drawExhaustPuffs.mock.calls.some(([, x]) => Math.abs(x - playerX(game)) < 1));
});

test('at night every vehicle lights the road ahead, and by day none does', () => {
  const night = racing(4);
  night.track.traffic[0].distance = night.player.distance + 6;
  drawWorld(quiet, view, night);
  for (const spy of [art.drawPlayerVehicle, art.drawRobotCar, art.drawTrafficCar]) assert.ok(optionsOf(spy).every((options) => options.headlights === true));
  vi.clearAllMocks();
  drawWorld(quiet, view, racing(1));
  assert.ok(optionsOf(art.drawPlayerVehicle).every((options) => options.headlights === false));
});

test('traffic leans the way it is changing lane', () => {
  const game = racing();
  Object.assign(game.track.traffic[0], { distance: game.player.distance + 6, steer: 0.7 });
  drawWorld(quiet, view, game);
  assert.ok(optionsOf(art.drawTrafficCar).some((options) => options.steer === 0.7));
});

test('a cone being knocked over tips, and one knocked earlier stands at the roadside', () => {
  const game = racing();
  const near = (offset) => ({ kind: 'cone', x: 3.5, distance: game.player.distance + offset, width: 0.8, length: 0.8, knocked: true });
  const tipping = near(4);
  const fallen = near(8);
  game.track.hazards = [tipping, fallen];
  game.moments = [{ kind: 'tip', thing: tipping, startedAt: game.time - 0.18 }];
  drawWorld(quiet, view, game);
  assert.equal(art.drawTippingCone.mock.calls.length, 1);
  assert.ok(Math.abs(optionsOf(art.drawTippingCone)[0].progress - 0.3) < 1e-9);
  assert.equal(art.drawCone.mock.calls.length, 1);
});

test('a splash and a burst of stars play where they happened', () => {
  const game = racing();
  game.moments = [
    { kind: 'splash', x: 1, distance: game.player.distance + 2, startedAt: game.time - 0.4 },
    { kind: 'bump', thing: game.player, startedAt: game.time - 0.45 },
  ];
  drawWorld(quiet, view, game);
  const [, splashX] = art.drawSplash.mock.calls[0];
  assert.ok(Math.abs(splashX - (view.width / 2 + view.scale)) < 1e-9);
  assert.ok(Math.abs(optionsOf(art.drawSplash)[0].progress - 0.5) < 1e-9);
  const [, burstX] = art.drawBumpBurst.mock.calls[0];
  assert.ok(Math.abs(burstX - playerX(game)) < 1e-9);
});

test('the finish arch stands over the finish line', () => {
  const game = racing();
  game.player.distance = game.track.length - 5;
  drawWorld(quiet, view, game);
  const [, , lineY] = art.drawFinishLine.mock.calls[0];
  const [, , archY, archWidth] = art.drawFinishArch.mock.calls[0];
  assert.ok(Math.abs(archY + archWidth * 0.43 - lineY) < 1e-9);
});

test('the player drives the chosen vehicle in its colour, in the same box as the car', () => {
  const game = racing();
  drawWorld(quiet, view, game, { kind: 'firetruck', color: 'mint' });
  const [call] = art.drawPlayerVehicle.mock.calls;
  assert.deepEqual([call[3], call[4]], [game.player.width * view.scale, game.player.length * view.scale]);
  assert.deepEqual([call[5].kind, call[5].color], ['firetruck', 'mint']);
  drawWorld(quiet, view, game);
  assert.deepEqual([optionsOf(art.drawPlayerVehicle)[1].kind, optionsOf(art.drawPlayerVehicle)[1].color], ['car', 'sunshine']);
});

test('in a race with a friend there is no robot, and the friend is drawn where they are, in their vehicle', () => {
  const game = createGame({ level: 1, seed: 3, robot: false });
  pressGo(game);
  for (let t = 0; t < 3; t += 1 / 60) stepGame(game, { accelerate: true, steer: 0, targetX: null }, 1 / 60);
  const rival = { distance: game.player.distance + 2, x: 1.5, speed: 8, kind: 'icecream', color: 'coral', braking: true };
  drawWorld(quiet, view, game, { kind: 'car', color: 'sunshine' }, rival);
  assert.equal(art.drawRobotCar.mock.calls.length, 0);
  const friend = art.drawPlayerVehicle.mock.calls.find((call) => call[5].kind === 'icecream');
  assert.ok(Math.abs(friend[1] - (view.width / 2 + 1.5 * view.scale)) < 1e-9);
  assert.deepEqual([friend[5].color, friend[5].braking], ['coral', true]);
  drawWorld(quiet, view, game, { kind: 'car', color: 'sunshine' }, null);
  assert.equal(art.drawRobotCar.mock.calls.length, 0);
});

test('a race of a minute or more shows a band across the road half way, and a shorter race shows none', () => {
  const long = racing(7);
  long.player.distance = long.track.halfway - 4;
  drawWorld(quiet, view, long);
  assert.equal(art.drawHalfwayBand.mock.calls.length, 1);
  const [, x, y, width] = art.drawHalfwayBand.mock.calls[0];
  assert.ok(Math.abs(x + width / 2 - view.width / 2) < 1e-9);
  assert.ok(Math.abs(width - 7.2 * view.scale) < 1e-9);
  assert.ok(Math.abs(y - (view.height * 0.8 - 4 * view.scale)) < 1e-9);
  vi.clearAllMocks();
  long.player.distance = long.track.halfway - 200;
  drawWorld(quiet, view, long);
  assert.equal(art.drawHalfwayBand.mock.calls.length, 0);
  const short = racing(1);
  short.player.distance = short.track.length / 2 - 4;
  drawWorld(quiet, view, short);
  assert.equal(art.drawHalfwayBand.mock.calls.length, 0);
});
