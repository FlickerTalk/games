import { test } from 'vitest';
import assert from 'node:assert/strict';
import { loadLevel, saveLevel, levelKey, BEST_LEVEL_KEY } from '../src/progress.js';

function memoryStore(values = {}) {
  const kept = new Map(Object.entries(values));
  const writes = [];
  return {
    kept,
    writes,
    get: async (key) => (kept.has(key) ? kept.get(key) : null),
    set: async (key, value) => {
      writes.push([key, value]);
      kept.set(key, value);
      return true;
    },
  };
}

test('the best level is read from the store', async () => {
  assert.equal(await loadLevel(memoryStore({ [BEST_LEVEL_KEY]: '7' })), 7);
});

test('without a stored level, or with nonsense in it, the race starts at level 1', async () => {
  assert.equal(await loadLevel(memoryStore()), 1);
  for (const said of ['abc', '0', '-3', '2.5', '', '1e3']) {
    assert.equal(await loadLevel(memoryStore({ [BEST_LEVEL_KEY]: said })), 1, said);
  }
});

test('without ft, or with a store that fails, the game still starts at level 1', async () => {
  assert.equal(await loadLevel(undefined), 1);
  assert.equal(await loadLevel({ get: async () => { throw new Error('gone'); } }), 1);
  assert.equal(await loadLevel({ get: () => { throw new Error('gone'); } }), 1);
});

test('a store that never answers does not hold the game back', async () => {
  const silent = { get: () => new Promise(() => {}) };
  assert.equal(await loadLevel(silent, { waitMs: 10 }), 1);
});

test('a new best level is written as text, and a failing write is ignored', async () => {
  const store = memoryStore();
  assert.equal(await saveLevel(store, 5), true);
  assert.deepEqual(store.writes, [[BEST_LEVEL_KEY, '5']]);
  assert.equal(await saveLevel({ set: async () => { throw new Error('full'); } }, 6), false);
  assert.equal(await saveLevel({ set: async () => false }, 6), false);
  assert.equal(await saveLevel(undefined, 6), false);
});

const CHAT = 'aB3_-xYz09aB3_-xYz09aB3_-xYz09aB3_-xYz09aB3';

test('each conversation keeps its own best level, and the full-page game the plain one', async () => {
  assert.equal(levelKey(CHAT), `${BEST_LEVEL_KEY}/${CHAT}`);
  assert.equal(levelKey(null), BEST_LEVEL_KEY);
  const store = memoryStore({ [BEST_LEVEL_KEY]: '9', [`${BEST_LEVEL_KEY}/${CHAT}`]: '3' });
  assert.equal(await loadLevel(store, { key: levelKey(CHAT) }), 3);
  assert.equal(await loadLevel(store, { key: levelKey(null) }), 9);
  assert.equal(await loadLevel(store, { key: levelKey('other') }), 1);
  await saveLevel(store, 4, levelKey(CHAT));
  assert.deepEqual(store.writes, [[`${BEST_LEVEL_KEY}/${CHAT}`, '4']]);
});

test('a chat that is not a plain id never reaches a key', () => {
  for (const chat of ['../x', 'a/b', '', `${CHAT}x`, 7]) assert.equal(levelKey(chat), BEST_LEVEL_KEY, String(chat));
});
