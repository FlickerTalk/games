import { test } from 'vitest';
import assert from 'node:assert/strict';
import { DEFAULT_VOLUME, volumeGain, normalizeVolume, volumeIcon } from '../src/sound-volume.js';

test('the line runs from silence at the bottom to the balanced mix at the top', () => {
  assert.equal(volumeGain(0), 0);
  assert.equal(volumeGain(1), 1);
  assert.equal(DEFAULT_VOLUME, 1);
});

test('the curve follows the ear: half way is clearly quieter than half the gain, and it never jumps', () => {
  const half = volumeGain(0.5);
  assert.ok(half >= 0.15 && half <= 0.35, `${half}`);
  for (let step = 1; step <= 100; step += 1) {
    assert.ok(volumeGain(step / 100) > volumeGain((step - 1) / 100), `${step}`);
    assert.ok(volumeGain(step / 100) - volumeGain((step - 1) / 100) <= 0.03, `${step}`);
  }
});

test('a position off the line is held at its ends', () => {
  assert.equal(volumeGain(-0.2), 0);
  assert.equal(volumeGain(2.5), 1);
  assert.equal(volumeGain(Number.NaN), 0);
});

test('a kept volume is a number from 0 to 1, and anything else is the default', () => {
  assert.equal(normalizeVolume(0.4), 0.4);
  assert.equal(normalizeVolume(0), 0);
  assert.equal(normalizeVolume(1), 1);
  for (const strange of [1.01, -0.1, '0.5', null, undefined, Number.NaN, Infinity, {}, 40]) assert.equal(normalizeVolume(strange), DEFAULT_VOLUME, String(strange));
});

test('the speaker icon shows the level: crossed out at zero, one wave when low, two when high', () => {
  assert.equal(volumeIcon(0), 'off');
  assert.equal(volumeIcon(0.01), 'low');
  assert.equal(volumeIcon(0.49), 'low');
  assert.equal(volumeIcon(0.5), 'high');
  assert.equal(volumeIcon(1), 'high');
});
