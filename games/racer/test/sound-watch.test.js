import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createCueWatcher } from '../src/sound-watch.js';

const snap = (overrides = {}) => ({
  scene: 'card', result: 'start', countdown: null, crossed: false, lead: null, time: 0, moments: [], garage: null, ...overrides,
});

function sequence(snapshots) {
  const watch = createCueWatcher();
  return snapshots.map((one) => watch(snap(one)));
}

test('nothing sounds on the first look, whatever is on screen', () => {
  const watch = createCueWatcher();
  assert.deepEqual(watch(snap({ scene: 'racing', moments: [{ kind: 'bump', by: 'player' }], lead: 5 })), []);
});

test('the countdown ticks at its start and halfway, and the green light says go', () => {
  const heard = sequence([
    { scene: 'card' },
    { scene: 'countdown', countdown: { timer: 1.5, length: 1.5 } },
    { scene: 'countdown', countdown: { timer: 1, length: 1.5 } },
    { scene: 'countdown', countdown: { timer: 0.7, length: 1.5 } },
    { scene: 'countdown', countdown: { timer: 0.2, length: 1.5 } },
    { scene: 'racing' },
    { scene: 'racing' },
  ]);
  assert.deepEqual(heard, [[], ['tick'], [], ['tick'], [], ['go'], []]);
});

test('a race that comes back from a pause counts down the same way', () => {
  const heard = sequence([
    { scene: 'paused' },
    { scene: 'countdown', countdown: { timer: 1, length: 1 } },
    { scene: 'countdown', countdown: { timer: 0.4, length: 1 } },
    { scene: 'racing' },
  ]);
  assert.deepEqual(heard, [[], ['tick'], ['tick'], ['go']]);
});

test('only the player\'s own crashes sound, a bump for a cone or a car and a splash for a puddle, each once', () => {
  const cone = { kind: 'bump', by: 'player' };
  const tip = { kind: 'tip', by: 'player' };
  const robotPuddle = { kind: 'splash', by: 'robot' };
  const puddle = { kind: 'splash', by: 'player' };
  const heard = sequence([
    { scene: 'racing', moments: [] },
    { scene: 'racing', moments: [tip, cone] },
    { scene: 'racing', moments: [tip, cone] },
    { scene: 'racing', moments: [cone, robotPuddle] },
    { scene: 'racing', moments: [robotPuddle, puddle] },
  ]);
  assert.deepEqual(heard, [[], ['bump'], [], [], ['splash']]);
});

test('passing the robot whooshes once it was really behind, and not again while neck and neck', () => {
  const heard = sequence([
    { scene: 'racing', lead: 0, time: 0 },
    { scene: 'racing', lead: 2, time: 1 },
    { scene: 'racing', lead: -3, time: 2 },
    { scene: 'racing', lead: 0.2, time: 3 },
    { scene: 'racing', lead: 1.5, time: 4 },
    { scene: 'racing', lead: -1.5, time: 4.5 },
    { scene: 'racing', lead: 1.5, time: 5 },
    { scene: 'racing', lead: -1.5, time: 7 },
    { scene: 'racing', lead: 1.5, time: 8 },
  ]);
  assert.deepEqual(heard, [[], [], [], [], ['whoosh'], [], [], [], ['whoosh']]);
});

test('a new race forgets who was ahead in the last one', () => {
  const heard = sequence([
    { scene: 'racing', lead: -3, time: 0 },
    { scene: 'finished', lead: -3, time: 1 },
    { scene: 'card', result: 'lost', time: 2 },
    { scene: 'countdown', countdown: { timer: 1.5, length: 1.5 }, time: 3 },
    { scene: 'racing', lead: 0, time: 5 },
    { scene: 'racing', lead: 2, time: 6 },
  ]);
  assert.deepEqual(heard.at(-1), []);
});

test('crossing the line chimes, and the robot crossing first does not', () => {
  assert.deepEqual(sequence([{ scene: 'racing' }, { scene: 'finished', crossed: true }]).at(-1), ['finish']);
  assert.deepEqual(sequence([{ scene: 'racing' }, { scene: 'finished', crossed: false }]).at(-1), []);
});

test('the result card plays the win tune, and the friendly two notes for any race not won', () => {
  assert.deepEqual(sequence([{ scene: 'finished' }, { scene: 'card', result: 'won' }]).at(-1), ['win']);
  assert.deepEqual(sequence([{ scene: 'finished' }, { scene: 'card', result: 'lost' }]).at(-1), ['lose']);
  assert.deepEqual(sequence([{ scene: 'racing' }, { scene: 'card', result: 'second' }]).at(-1), ['lose']);
  assert.deepEqual(sequence([{ scene: 'racing' }, { scene: 'card', result: 'start' }]).at(-1), []);
});

test('a present opening sparkles, and closing it taps', () => {
  assert.deepEqual(sequence([{ scene: 'finished' }, { scene: 'gift' }, { scene: 'card', result: 'won' }]).slice(1), [['gift'], ['tap']]);
});

test('the garage taps open and shut and page by page, picks a vehicle or colour, and nudges a locked one', () => {
  const garage = (overrides) => ({ scene: 'garage', garage: { kind: 'car', color: 'sunshine', page: 0, nudgeAt: null, ...overrides } });
  const heard = sequence([
    { scene: 'card' },
    garage({}),
    garage({ kind: 'bus' }),
    garage({ kind: 'bus', color: 'mint' }),
    garage({ kind: 'bus', color: 'mint', page: 1 }),
    garage({ kind: 'bus', color: 'mint', page: 1, nudgeAt: 4 }),
    garage({ kind: 'bus', color: 'mint', page: 1, nudgeAt: 4 }),
    garage({ kind: 'bus', color: 'mint', page: 1, nudgeAt: 6 }),
    { scene: 'card' },
  ]);
  assert.deepEqual(heard, [[], ['tap'], ['pick'], ['pick'], ['tap'], ['nudge'], [], ['nudge'], ['tap']]);
});
