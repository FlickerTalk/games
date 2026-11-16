// @vitest-environment node
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { childDriver, raceOnce } from './child-driver.js';
import { laneCenters } from '../src/track.js';
import { SIZES, raceSeconds } from '../src/tuning.js';
import { overlaps } from '../src/cars.js';

const LEVELS = [1, 5, 7, 12, 30];
const SIMULATION_MS = 60000;
const SEEDS = 30;
const idle = () => ({ accelerate: false, steer: 0, targetX: null });

function races(level, driverFor = (seed) => childDriver(seed * 31 + level)) {
  return Array.from({ length: SEEDS }, (_, index) => raceOnce({ level, seed: index + 1, driver: driverFor(index + 1) }));
}

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

test('a small child who holds the finger down and steers late and roughly wins most races at every level', () => {
  for (const level of LEVELS) {
    const results = races(level);
    const wins = results.filter((result) => result.won).length;
    assert.ok(wins >= SEEDS * 0.65, `level ${level}: ${wins}/${SEEDS}`);
    assert.ok(median(results.map((result) => result.gap)) <= 30, `level ${level}: finish gaps ${results.map((result) => result.gap.toFixed(0))}`);
    assert.ok(results.every((result) => result.raceTime <= raceSeconds(level) * 1.4), `level ${level}: ${Math.max(...results.map((result) => result.raceTime))} s`);
  }
}, SIMULATION_MS);

test('the robot still wins when the child stops driving', () => {
  for (const level of [1, 5, 30]) {
    assert.ok(races(level, () => idle).every((result) => !result.won), `level ${level}`);
  }
}, SIMULATION_MS);

test('after three forced losses on a level the child moves on with a celebration', () => {
  for (const level of [1, 7, 30]) {
    const { game } = raceOnce({ level, seed: 9, driver: idle });
    raceOnce({ level, seed: 9, driver: idle, game });
    assert.equal(game.level, level);
    raceOnce({ level, seed: 9, driver: idle, game });
    assert.deepEqual([game.level, game.lastResult, game.state], [level + 1, 'won', 'ready']);
  }
}, SIMULATION_MS);

function lanesBlocked(things) {
  return laneCenters.filter((lane) => things.some((thing) => overlaps({ x: lane, distance: thing.distance, ...SIZES.player }, thing)));
}

test('there is always a free lane ahead of the player, never a wall across the road', () => {
  for (const level of [1, 5, 30]) {
    for (let seed = 1; seed <= 10; seed += 1) {
      raceOnce({
        level,
        seed,
        driver: childDriver(seed),
        watch: (game) => {
          const { player, track } = game;
          const ahead = [...track.traffic, ...track.hazards].filter((thing) => !thing.knocked
            && thing.distance > player.distance && thing.distance < player.distance + 30);
          for (const thing of ahead) {
            const row = ahead.filter((other) => Math.abs(other.distance - thing.distance) < 2.5);
            assert.ok(lanesBlocked(row).length < laneCenters.length, `level ${level} seed ${seed} at ${player.distance.toFixed(1)}`);
          }
        },
      });
    }
  }
}, SIMULATION_MS);
