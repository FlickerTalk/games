import { test } from 'vitest';
import assert from 'node:assert/strict';
import { sceneryFor, groundColor } from '../src/scenery.js';
import { PALETTE } from '../src/art.js';

test('scenery cycles meadow, desert, snow and night city', () => {
  const names = [1, 2, 3, 4, 5, 6, 7, 8].map((level) => sceneryFor(level));
  assert.deepEqual(names, ['meadow', 'desert', 'snow', 'night', 'meadow', 'desert', 'snow', 'night']);
});

test('the ground beyond the verges matches the scenery colour', () => {
  assert.equal(groundColor('meadow'), PALETTE.meadow);
  assert.equal(groundColor('desert'), PALETTE.desert);
  assert.equal(groundColor('snow'), PALETTE.snow);
  assert.equal(groundColor('night'), PALETTE.city);
});
