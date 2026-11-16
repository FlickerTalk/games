import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createClock } from '../src/clock.js';

test('a step is the time since the last frame, in seconds', () => {
  const clock = createClock();
  assert.equal(clock.tick(1000), 0);
  assert.ok(Math.abs(clock.tick(1016) - 0.016) < 1e-9);
});

test('a slow frame is capped so the race never jumps ahead', () => {
  const clock = createClock();
  clock.tick(1000);
  assert.equal(clock.tick(1080), 0.05);
});

test('after frames stopped arriving the race carries on from where it was', () => {
  const clock = createClock();
  clock.tick(1000);
  clock.tick(1016);
  assert.equal(clock.tick(6000), 0);
  assert.ok(Math.abs(clock.tick(6016) - 0.016) < 1e-9);
});

test('a reset clock starts over and time going backwards is ignored', () => {
  const clock = createClock();
  clock.tick(1000);
  clock.reset();
  assert.equal(clock.tick(9000), 0);
  assert.equal(clock.tick(8000), 0);
});
