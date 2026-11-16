import { test } from 'vitest';
import assert from 'node:assert/strict';
import { STARTER_KINDS, normalizeProfile, chooseVehicle, chooseColor, awardWin, noteLevel } from '../src/profile.js';
import { PROFILE_KEY, loadProfile, saveProfile } from '../src/progress.js';
import { VEHICLE_KINDS } from '../src/art.js';
import { createRandom } from '../src/random.js';

const fresh = { kind: 'car', color: 'sunshine', received: ['car', 'motorbike', 'kart', 'truck', 'bus'], winsSinceGift: 0, topLevel: 1 };

function memoryStore(values = {}) {
  const writes = [];
  return {
    writes,
    get: async (key) => values[key] ?? null,
    set: async (key, value) => {
      writes.push([key, value]);
      values[key] = value;
      return true;
    },
  };
}

test('a new player has the five everyday vehicles and drives the yellow car', () => {
  assert.deepEqual(STARTER_KINDS, ['car', 'motorbike', 'kart', 'truck', 'bus']);
  for (const raw of [undefined, null, 'nonsense', 42, [], {}]) assert.deepEqual(normalizeProfile(raw), fresh);
});

test('anything unknown or not yet received falls back to the car and the first colour', () => {
  assert.deepEqual(normalizeProfile({ kind: 'rocket', color: 'plaid', received: ['rocket', 'ufo', 'bus'], winsSinceGift: -3 }), {
    kind: 'rocket', color: 'sunshine', received: ['car', 'motorbike', 'kart', 'truck', 'bus', 'rocket'], winsSinceGift: 0, topLevel: 1,
  });
  assert.equal(normalizeProfile({ kind: 'police', received: [] }).kind, 'car');
  assert.equal(normalizeProfile({ kind: 'ufo' }).kind, 'car');
  assert.equal(normalizeProfile({ kind: 'bus', color: 'mint', winsSinceGift: 2.7 }).winsSinceGift, 2);
  assert.equal(normalizeProfile({ kind: 'bus', color: 'mint' }).color, 'mint');
});

test('the profile belongs to the player, not to a chat, and survives a reload', async () => {
  const store = memoryStore();
  const profile = { ...fresh, kind: 'tractor', color: 'ocean', received: [...fresh.received, 'tractor'], winsSinceGift: 1 };
  assert.equal(await saveProfile(store, profile), true);
  assert.deepEqual(store.writes.map(([key]) => key), [PROFILE_KEY]);
  assert.ok(!PROFILE_KEY.includes('/'));
  assert.deepEqual(await loadProfile(store), profile);
});

test('a broken, slow or missing store still gives a playable profile', async () => {
  assert.deepEqual(await loadProfile(memoryStore({ [PROFILE_KEY]: '{not json' })), fresh);
  assert.deepEqual(await loadProfile(undefined), fresh);
  assert.deepEqual(await loadProfile({ get: () => new Promise(() => {}) }, { waitMs: 10 }), fresh);
  assert.deepEqual(await loadProfile({ get: () => Promise.reject(new Error('no')) }), fresh);
  assert.equal(await saveProfile({ set: () => Promise.reject(new Error('no')) }, fresh), false);
});

test('only a received vehicle and a known colour can be chosen', () => {
  const profile = normalizeProfile(null);
  assert.equal(chooseVehicle(profile, 'rocket'), false);
  assert.equal(profile.kind, 'car');
  assert.equal(chooseVehicle(profile, 'bus'), true);
  assert.equal(profile.kind, 'bus');
  assert.equal(chooseColor(profile, 'lavender'), true);
  assert.equal(chooseColor(profile, 'plaid'), false);
  assert.equal(profile.color, 'lavender');
});

function giftWins(seed, wins) {
  const profile = normalizeProfile(null);
  const random = createRandom(seed);
  const gifts = [];
  for (let win = 1; win <= wins; win += 1) {
    const gift = awardWin(profile, random);
    if (gift) gifts.push({ win, gift });
  }
  return { profile, gifts };
}

test('gifts never come on the first win and then arrive every two to four wins until every vehicle is received', () => {
  const gaps = [];
  for (let seed = 1; seed <= 200; seed += 1) {
    const { profile, gifts } = giftWins(seed, 60);
    assert.ok(gifts[0].win >= 2 && gifts[0].win <= 4, `seed ${seed}: first gift on win ${gifts[0].win}`);
    gifts.forEach(({ win }, index) => {
      if (index > 0) gaps.push(win - gifts[index - 1].win);
    });
    assert.deepEqual(gifts.map(({ gift }) => gift).sort(), VEHICLE_KINDS.slice(5).sort());
    assert.deepEqual([...profile.received].sort(), [...VEHICLE_KINDS].sort());
  }
  assert.ok(gaps.every((gap) => gap >= 2 && gap <= 4));
  const mean = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
  assert.ok(mean > 2.4 && mean < 3.4, `${mean}`);
  assert.ok(new Set(gaps).size === 3);
});

test('a new vehicle becomes the one the child drives, and the colour stays', () => {
  const profile = normalizeProfile({ kind: 'bus', color: 'ocean', winsSinceGift: 3 });
  const gift = awardWin(profile, createRandom(5));
  assert.ok(VEHICLE_KINDS.slice(5).includes(gift));
  assert.deepEqual([profile.kind, profile.color, profile.winsSinceGift], [gift, 'ocean', 0]);
});

test('the same seed gives the same gifts, so a race can be replayed', () => {
  assert.deepEqual(giftWins(9, 30).gifts, giftWins(9, 30).gifts);
});

test('the highest level reached anywhere is kept with the player, for races with a friend', () => {
  const profile = normalizeProfile({ topLevel: 7 });
  assert.equal(profile.topLevel, 7);
  assert.equal(noteLevel(profile, 5), false);
  assert.equal(noteLevel(profile, 9), true);
  assert.equal(profile.topLevel, 9);
  for (const topLevel of [0, -2, 'nine', 2.5, null]) assert.equal(normalizeProfile({ topLevel }).topLevel, topLevel === 2.5 ? 2 : 1);
});
