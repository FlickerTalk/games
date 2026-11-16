import { test } from 'vitest';
import assert from 'node:assert/strict';
import { noteCrash, activeMoments, MOMENT_SECONDS } from '../src/moments.js';

const fresh = () => ({ time: 10, moments: [] });
const car = () => ({ kind: 'player', x: 0.4, distance: 50 });

test('a cone that is hit tips over and the car bursts with stars', () => {
  const game = fresh();
  const driver = car();
  const cone = { kind: 'cone', x: 0.5, distance: 50.3 };
  noteCrash(game, driver, cone);
  const moments = activeMoments(game);
  assert.deepEqual(moments.map((moment) => moment.kind).sort(), ['bump', 'tip']);
  assert.equal(moments.find((moment) => moment.kind === 'tip').thing, cone);
  assert.equal(moments.find((moment) => moment.kind === 'bump').thing, driver);
  for (const moment of moments) assert.equal(moment.progress, 0);
});

test('a puddle splashes where the car went in, without stars', () => {
  const game = fresh();
  noteCrash(game, car(), { kind: 'puddle', x: 1, distance: 51 });
  const [splash, ...rest] = activeMoments(game);
  assert.equal(rest.length, 0);
  assert.equal(splash.kind, 'splash');
  assert.deepEqual([splash.x, splash.distance], [0.4, 51]);
});

test('running into traffic bursts with stars', () => {
  const game = fresh();
  noteCrash(game, car(), { kind: 'traffic', x: 0.4, distance: 51 });
  assert.deepEqual(activeMoments(game).map((moment) => moment.kind), ['bump']);
});

test('each moment runs for its own time and is then forgotten', () => {
  const game = fresh();
  noteCrash(game, car(), { kind: 'puddle', x: 1, distance: 51 });
  game.time += MOMENT_SECONDS.splash / 2;
  assert.ok(Math.abs(activeMoments(game)[0].progress - 0.5) < 1e-9);
  game.time += MOMENT_SECONDS.splash;
  assert.deepEqual(activeMoments(game), []);
  assert.deepEqual(game.moments, []);
});

test('each moment says whose crash it was, so only the player\'s own can be heard', () => {
  const game = fresh();
  noteCrash(game, car(), { kind: 'cone', x: 0.5, distance: 50.3 });
  noteCrash(game, { kind: 'robot', x: 1, distance: 60 }, { kind: 'puddle', x: 1, distance: 60 });
  assert.deepEqual(activeMoments(game).map((moment) => [moment.kind, moment.by]), [['tip', 'player'], ['bump', 'player'], ['splash', 'robot']]);
});
