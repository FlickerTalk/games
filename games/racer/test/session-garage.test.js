import { test } from 'vitest';
import assert from 'node:assert/strict';
import { setUp, memoryStore } from './session-harness.js';
import { PROFILE_KEY, BEST_LEVEL_KEY } from '../src/progress.js';
import { VEHICLE_KINDS, garageTiles, garageColorDots, garageDoneButton, GIFT_REVEAL_SECONDS } from '../src/art.js';

const tap = (canvas, { x, y }) => canvas.dispatchEvent(Object.assign(new Event('click'), { offsetX: x, offsetY: y }));
const centre = (box) => ({ x: box.centerX, y: box.centerY });
const stored = (store) => JSON.parse(store.writes.filter(([name]) => name === PROFILE_KEY).at(-1)[1]);
const profileWith = (fields) => memoryStore({ [PROFILE_KEY]: JSON.stringify(fields) });

async function inGarage(options) {
  const opened = await setUp(options);
  opened.play(0.05);
  tap(opened.canvas, centre(opened.session.renderer.garageButton()));
  opened.play(0.05);
  return opened;
}

test('the player\'s vehicle and colour come from the player profile, the same in every chat', async () => {
  const chat = 'aB3_-xYz09aB3_-xYz09aB3_-xYz09aB3_-xYz09aB3';
  const opening = { whenOpened: async () => ({ solo: true, chat, lang: 'en' }) };
  const store = profileWith({ kind: 'bus', color: 'mint', received: ['rocket'], winsSinceGift: 1 });
  const { session } = await setUp({ store, opening });
  assert.deepEqual([session.profile.kind, session.profile.color], ['bus', 'mint']);
  assert.ok(session.profile.received.includes('rocket'));
});

test('the garage button on the card opens the garage, and the go button waits behind it', async () => {
  const { session, goButton, keyTarget } = await inGarage();
  assert.equal(session.screen.name, 'garage');
  assert.equal(goButton.hidden, true);
  keyTarget.dispatchEvent(Object.assign(new Event('keydown'), { key: 'Enter' }));
  assert.equal(session.game.state, 'ready');
});

test('a tap anywhere else on the card does not open the garage', async () => {
  const { session, canvas, play } = await setUp();
  play(0.05);
  tap(canvas, { x: 5, y: 700 });
  assert.equal(session.screen, null);
});

test('choosing a vehicle and a colour is kept in the profile at once, and go closes the garage', async () => {
  const { session, canvas, store, goButton, play } = await inGarage();
  const { width, height } = session.renderer.screenSize();
  const kart = garageTiles(width, height, VEHICLE_KINDS, session.screen.page).find((tile) => tile.kind === 'kart');
  tap(canvas, centre(kart));
  await Promise.resolve();
  assert.equal(stored(store).kind, 'kart');
  tap(canvas, centre(garageColorDots(width, height).find((dot) => dot.color === 'coral')));
  await Promise.resolve();
  assert.deepEqual([stored(store).kind, stored(store).color], ['kart', 'coral']);
  tap(canvas, centre(garageDoneButton(width, height)));
  play(0.05);
  assert.equal(session.screen, null);
  assert.equal(goButton.hidden, false);
});

test('a present in the garage cannot be chosen and nothing is written', async () => {
  const { session, canvas, store } = await inGarage();
  const { width, height } = session.renderer.screenSize();
  const rocket = garageTiles(width, height, VEHICLE_KINDS, session.screen.page).find((tile) => tile.kind === 'rocket');
  tap(canvas, centre(rocket));
  await Promise.resolve();
  assert.equal(session.profile.kind, 'car');
  assert.equal(store.writes.filter(([name]) => name === PROFILE_KEY).length, 0);
});

async function winOnce(opened) {
  const { session, goButton, keyTarget, play } = opened;
  goButton.click();
  play(1.6);
  session.game.player.distance = session.game.track.length - 0.05;
  keyTarget.dispatchEvent(Object.assign(new Event('keydown'), { key: 'ArrowUp' }));
  play(1.6);
  keyTarget.dispatchEvent(Object.assign(new Event('keyup'), { key: 'ArrowUp' }));
  await Promise.resolve();
}

test('the very first win of a new player brings no gift, only the next card', async () => {
  const opened = await setUp();
  await winOnce(opened);
  assert.equal(opened.session.game.level, 2);
  assert.equal(opened.session.screen, null);
  assert.equal(stored(opened.store).winsSinceGift, 1);
});

test('a gift that is due plays before the card, waits for its end, and then is the vehicle driven', async () => {
  const store = profileWith({ kind: 'bus', color: 'ocean', winsSinceGift: 3 });
  const opened = await setUp({ store });
  await winOnce(opened);
  const { session, canvas, goButton, play } = opened;
  assert.equal(session.screen.name, 'gift');
  const gift = session.screen.kind;
  assert.ok(VEHICLE_KINDS.slice(5).includes(gift));
  assert.equal(goButton.hidden, true);
  assert.deepEqual([stored(store).kind, stored(store).color, stored(store).winsSinceGift], [gift, 'ocean', 0]);
  assert.ok(stored(store).received.includes(gift));
  tap(canvas, { x: 100, y: 100 });
  assert.equal(session.screen.name, 'gift');
  play(GIFT_REVEAL_SECONDS + 0.1);
  tap(canvas, { x: 100, y: 100 });
  play(0.05);
  assert.equal(session.screen, null);
  assert.equal(goButton.hidden, false);
  assert.equal(session.profile.kind, gift);
});

test('hiding the page while in the garage changes nothing and needs no countdown', async () => {
  const { session, page, play } = await inGarage();
  page.visibilityState = 'hidden';
  page.dispatchEvent(new Event('visibilitychange'));
  play(0.5);
  page.visibilityState = 'visible';
  page.dispatchEvent(new Event('visibilitychange'));
  play(0.5);
  assert.deepEqual([session.screen.name, session.game.state], ['garage', 'ready']);
  assert.equal(BEST_LEVEL_KEY, 'best-level');
});

test('the garage button wiggles on the first card until the garage has been opened once', async () => {
  const { session, canvas, play } = await setUp();
  const asked = [];
  const draw = session.renderer.draw;
  session.renderer.draw = (game, time, hud) => {
    asked.push(hud.garageHint);
    draw(game, time, hud);
  };
  play(0.05);
  assert.equal(asked.at(-1), true);
  tap(canvas, centre(session.renderer.garageButton()));
  const { width, height } = session.renderer.screenSize();
  tap(canvas, centre(garageDoneButton(width, height)));
  play(0.05);
  assert.equal(session.screen, null);
  assert.equal(asked.at(-1), false);
});
