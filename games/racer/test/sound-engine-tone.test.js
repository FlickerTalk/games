import { test } from 'vitest';
import assert from 'node:assert/strict';
import { engineTone, ENGINE_LOUDEST } from '../src/sound-engine-tone.js';

const shares = [0, 0.1, 0.25, 0.5, 0.75, 1];

test('the engine rises in pitch, brightness, purr and loudness with the speed', () => {
  const tones = shares.map((share) => engineTone({ share, pressing: false }));
  for (let index = 1; index < tones.length; index += 1) {
    for (const part of ['frequency', 'gain', 'cutoff', 'purr']) assert.ok(tones[index][part] > tones[index - 1][part], `${part} at ${shares[index]}`);
  }
});

test('standing still it idles low and quiet, and at full speed it stays a gentle hum', () => {
  const idle = engineTone({ share: 0, pressing: false });
  const full = engineTone({ share: 1, pressing: true });
  assert.ok(idle.gain > 0 && idle.gain < full.gain / 1.5);
  assert.ok(idle.frequency >= 50 && idle.frequency <= 80);
  assert.ok(full.frequency <= 180);
  assert.ok(full.gain <= ENGINE_LOUDEST && ENGINE_LOUDEST <= 0.12);
  assert.ok(full.cutoff <= 1400);
});

test('pressing the pedal adds a little push without going over the ceiling', () => {
  const coasting = engineTone({ share: 0.5, pressing: false });
  const pressing = engineTone({ share: 0.5, pressing: true });
  assert.ok(pressing.gain > coasting.gain);
  assert.equal(pressing.frequency, coasting.frequency);
});

test('a speed share outside 0 to 1 or not a number is held at the ends', () => {
  assert.deepEqual(engineTone({ share: -2, pressing: false }), engineTone({ share: 0, pressing: false }));
  assert.deepEqual(engineTone({ share: 3, pressing: true }), engineTone({ share: 1, pressing: true }));
  assert.deepEqual(engineTone({ share: Number.NaN, pressing: false }), engineTone({ share: 0, pressing: false }));
});
