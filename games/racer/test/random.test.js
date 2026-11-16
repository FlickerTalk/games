import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createRandom } from '../src/random.js';

test('the same seed gives the same sequence', () => {
  const first = createRandom(42);
  const second = createRandom(42);
  const a = Array.from({ length: 5 }, () => first.next());
  const b = Array.from({ length: 5 }, () => second.next());
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, Array.from({ length: 5 }, () => createRandom(43).next()));
});

test('numbers fall in the requested range', () => {
  const random = createRandom(7);
  for (let i = 0; i < 500; i += 1) {
    const value = random.range(-2, 3);
    assert.ok(value >= -2 && value < 3);
    const unit = random.next();
    assert.ok(unit >= 0 && unit < 1);
  }
});

test('pick returns one of the items and chance follows its probability', () => {
  const random = createRandom(3);
  const items = ['a', 'b', 'c'];
  for (let i = 0; i < 50; i += 1) assert.ok(items.includes(random.pick(items)));
  assert.equal(random.chance(0), false);
  assert.equal(random.chance(1), true);
});
