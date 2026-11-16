import { test } from 'vitest';
import assert from 'node:assert/strict';
import { pluck, hold, noise } from '../src/sound-voices.js';

test('a pluck strikes fast and dies away over its length', () => {
  assert.deepEqual(pluck('sine', 440, 0.1, 0.3, 0.2), {
    wave: 'sine', frequency: 440, start: 0.1, duration: 0.3, gain: 0.2, attack: 0.004, shape: 'pluck',
  });
});

test('a held note swells in and lets go before its end, never longer than half of it', () => {
  const long = hold('triangle', 220, 0, 1, 0.1);
  assert.equal(long.shape, 'hold');
  assert.ok(long.attack > 0.004 && long.attack < 0.05);
  assert.equal(long.release, 0.12);
  assert.equal(hold('triangle', 220, 0, 0.1, 0.1).release, 0.05);
});

test('noise has no pitch, takes its colour from a filter, and any part can be overridden', () => {
  const splash = noise(0, 0.2, 0.1, { type: 'bandpass', frequency: 900, q: 1 }, { attack: 0.05 });
  assert.equal(splash.wave, 'noise');
  assert.equal(splash.frequency, undefined);
  assert.equal(splash.attack, 0.05);
  assert.deepEqual(splash.filter, { type: 'bandpass', frequency: 900, q: 1 });
  assert.equal(pluck('sine', 300, 0, 0.2, 0.1, { toFrequency: 120 }).toFrequency, 120);
});
