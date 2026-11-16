import { test } from 'vitest';
import assert from 'node:assert/strict';
import { openGarage, tapGarage, garageView, openGift, tapGift, giftView, NUDGE_SECONDS } from '../src/garage-screen.js';
import { normalizeProfile } from '../src/profile.js';
import {
  VEHICLE_KINDS, GIFT_REVEAL_SECONDS, garageTiles, garageColorDots, garageDoneButton, garagePageButtons, garagePageCount,
} from '../src/art.js';

const ROOM = { width: 360, height: 343 };
const PHONE = { width: 360, height: 640 };
const middle = (box) => ({ x: box.centerX, y: box.centerY });
const tileOf = (size, screen, kind) => garageTiles(size.width, size.height, VEHICLE_KINDS, screen.page).find((tile) => tile.kind === kind);

test('the garage opens on the page that shows the vehicle being driven', () => {
  const profile = normalizeProfile({ kind: 'bus' });
  const screen = openGarage(profile, ROOM);
  assert.equal(screen.name, 'garage');
  assert.ok(tileOf(ROOM, screen, 'bus'));
});

test('tapping a vehicle the child has picks it, and tapping a colour paints it', () => {
  const profile = normalizeProfile(null);
  const screen = openGarage(profile, PHONE);
  assert.equal(tapGarage(screen, profile, middle(tileOf(PHONE, screen, 'kart')), { ...PHONE, time: 1 }), 'changed');
  assert.equal(profile.kind, 'kart');
  const mint = garageColorDots(PHONE.width, PHONE.height).find((dot) => dot.color === 'mint');
  assert.equal(tapGarage(screen, profile, middle(mint), { ...PHONE, time: 1 }), 'changed');
  assert.equal(profile.color, 'mint');
  assert.equal(tapGarage(screen, profile, { x: 1, y: 1 }, { ...PHONE, time: 1 }), null);
});

test('tapping a present only makes it shake for a moment', () => {
  const profile = normalizeProfile(null);
  const screen = openGarage(profile, PHONE);
  assert.equal(tapGarage(screen, profile, middle(tileOf(PHONE, screen, 'rocket')), { ...PHONE, time: 4 }), 'nudged');
  assert.equal(profile.kind, 'car');
  const { nudge } = garageView(screen, profile, 4 + NUDGE_SECONDS / 2);
  assert.equal(nudge.kind, 'rocket');
  assert.ok(Math.abs(nudge.progress - 0.5) < 1e-9);
  assert.equal(garageView(screen, profile, 4 + NUDGE_SECONDS * 2).nudge, null);
});

test('the arrows turn the pages round and round, and only when there is more than one', () => {
  const profile = normalizeProfile(null);
  const screen = openGarage(profile, ROOM);
  const pages = garagePageCount(ROOM.width, ROOM.height, VEHICLE_KINDS);
  assert.ok(pages > 1);
  const { previous, next } = garagePageButtons(ROOM.width, ROOM.height);
  assert.equal(tapGarage(screen, profile, middle(previous), { ...ROOM, time: 0 }), 'paged');
  assert.equal(screen.page, pages - 1);
  assert.equal(tapGarage(screen, profile, middle(next), { ...ROOM, time: 0 }), 'paged');
  assert.equal(screen.page, 0);
  const single = openGarage(profile, PHONE);
  assert.equal(garagePageCount(PHONE.width, PHONE.height, VEHICLE_KINDS), 1);
  tapGarage(single, profile, middle(garagePageButtons(PHONE.width, PHONE.height).next), { ...PHONE, time: 0 });
  assert.equal(single.page, 0);
});

test('the round go button closes the garage', () => {
  const profile = normalizeProfile(null);
  const screen = openGarage(profile, ROOM);
  assert.equal(tapGarage(screen, profile, middle(garageDoneButton(ROOM.width, ROOM.height)), { ...ROOM, time: 0 }), 'closed');
});

test('what the garage draws follows the profile', () => {
  const profile = normalizeProfile({ kind: 'truck', color: 'coral', received: ['police'] });
  const view = garageView(openGarage(profile, PHONE), profile, 2);
  assert.deepEqual([view.selected, view.color, view.time, view.page, view.nudge], ['truck', 'coral', 2, 0, null]);
  assert.deepEqual(view.unlocked, profile.received);
  assert.deepEqual(view.kinds, VEHICLE_KINDS);
});

test('the gift waits until its reveal has played before a tap goes on', () => {
  const screen = openGift('firetruck', 10);
  assert.equal(screen.name, 'gift');
  assert.equal(tapGift(screen, 10 + GIFT_REVEAL_SECONDS - 0.1), null);
  assert.equal(tapGift(screen, 10 + GIFT_REVEAL_SECONDS + 0.01), 'closed');
  assert.deepEqual(giftView(screen, normalizeProfile({ color: 'ocean' }), 11.5), { kind: 'firetruck', color: 'ocean', time: 1.5 });
});

test('while the police car or the fire engine is chosen a colour tap changes nothing', () => {
  const profile = normalizeProfile({ kind: 'police', color: 'ocean', received: ['police'] });
  const screen = openGarage(profile, PHONE);
  const mint = garageColorDots(PHONE.width, PHONE.height).find((dot) => dot.color === 'mint');
  assert.equal(tapGarage(screen, profile, middle(mint), { ...PHONE, time: 1 }), null);
  assert.equal(profile.color, 'ocean');
});
