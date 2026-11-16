import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createSession } from '../src/session.js';
import { BEST_LEVEL_KEY, PROFILE_KEY } from '../src/progress.js';
import { setUp, memoryStore, fakeFrames, counted, quietCanvas } from './session-harness.js';

const levelWrites = (store) => store.writes.filter(([name]) => name !== PROFILE_KEY);
const key = (target, type, name) => target.dispatchEvent(Object.assign(new Event(type), { key: name }));

test('the race starts at the best level kept in the store', async () => {
  const { session, goButton, play } = await setUp({ store: memoryStore({ [BEST_LEVEL_KEY]: '4' }) });
  play(0.05);
  assert.equal(session.game.level, 4);
  assert.equal(goButton.getAttribute('aria-label'), 'Start level 4');
});

test('without ft the game starts at level 1', async () => {
  const { session } = await setUp({ store: undefined });
  assert.equal(session.game.level, 1);
});

test('the go button covers the drawn one, starts the race and steps aside during it', async () => {
  const { session, goButton, play } = await setUp();
  play(0.05);
  const drawn = session.renderer.goButton();
  const left = parseFloat(goButton.style.left);
  const top = parseFloat(goButton.style.top);
  assert.ok(left <= drawn.x && top <= drawn.y);
  assert.ok(left + parseFloat(goButton.style.width) >= drawn.x + drawn.width);
  assert.ok(top + parseFloat(goButton.style.height) >= drawn.y + drawn.height);
  assert.equal(goButton.hidden, false);
  goButton.click();
  play(0.05);
  assert.equal(session.game.state, 'countdown');
  assert.equal(goButton.hidden, true);
});

test('the label follows the page language', async () => {
  const { goButton, page, play } = await setUp();
  page.documentElement.lang = 'es';
  play(0.05);
  assert.equal(goButton.getAttribute('aria-label'), 'Empezar el nivel 1');
});

test('a level won is kept as the new best, a level lost is not', async () => {
  const { session, goButton, keyTarget, store, play } = await setUp();
  goButton.click();
  play(1.6);
  session.game.player.distance = session.game.track.length - 0.05;
  key(keyTarget, 'keydown', 'ArrowUp');
  play(0.2);
  assert.equal(session.game.lastResult, 'won');
  play(1.4);
  await Promise.resolve();
  assert.equal(session.game.level, 2);
  assert.deepEqual(levelWrites(store), [[BEST_LEVEL_KEY, '2']]);
  key(keyTarget, 'keyup', 'ArrowUp');
  goButton.click();
  play(1.6);
  session.game.robot.distance = session.game.track.length - 0.05;
  play(1.6);
  await Promise.resolve();
  assert.equal(session.game.lastResult, 'lost');
  assert.deepEqual(levelWrites(store), [[BEST_LEVEL_KEY, '2']]);
});

const finger = (canvas, type, pointerId) => canvas.dispatchEvent(Object.assign(new Event(type), { pointerId, clientX: 150 }));
const hide = (page, hidden) => {
  page.visibilityState = hidden ? 'hidden' : 'visible';
  page.dispatchEvent(new Event('visibilitychange'));
};

test('a hidden page pauses the race, which waits for a new press and counts down a short second', async () => {
  const { session, goButton, page, canvas, play } = await setUp();
  goButton.click();
  play(2.5);
  const { distance, x } = session.game.player;
  const raceTime = session.game.raceTime;
  hide(page, true);
  play(0.5);
  assert.equal(session.game.state, 'paused');
  hide(page, false);
  play(2);
  assert.equal(session.game.state, 'paused');
  assert.equal(session.game.player.distance, distance);
  finger(canvas, 'pointerdown', 1);
  play(0.05);
  assert.equal(session.game.state, 'countdown');
  play(0.6);
  assert.equal(session.game.state, 'countdown');
  assert.equal(session.game.player.distance, distance);
  play(0.5);
  assert.equal(session.game.state, 'racing');
  assert.ok(Math.abs(session.game.player.x - x) < 1e-9);
  assert.ok(session.game.raceTime >= raceTime && session.game.raceTime < raceTime + 0.6);
});

test('losing focus to the app around the game, as a tap on its full screen button does, does not pause the race', async () => {
  const { session, goButton, keyTarget, play } = await setUp();
  goButton.click();
  play(2);
  const { raceTime } = session.game;
  const robot = session.game.robot.distance;
  keyTarget.dispatchEvent(new Event('blur'));
  play(1);
  assert.equal(session.game.state, 'racing');
  assert.ok(session.game.raceTime > raceTime + 0.9);
  assert.ok(session.game.robot.distance > robot);
});

test('a finger already down when the race paused does not resume it', async () => {
  const { session, goButton, page, canvas, play } = await setUp();
  goButton.click();
  play(2);
  finger(canvas, 'pointerdown', 1);
  play(0.5);
  hide(page, true);
  hide(page, false);
  play(1);
  assert.equal(session.game.state, 'paused');
  finger(canvas, 'pointerup', 1);
  play(0.5);
  assert.equal(session.game.state, 'paused');
  finger(canvas, 'pointerdown', 2);
  play(0.05);
  assert.equal(session.game.state, 'countdown');
});

test('nothing pauses the start card', async () => {
  const { session, goButton, page, play } = await setUp();
  hide(page, true);
  hide(page, false);
  play(0.1);
  assert.equal(session.game.state, 'ready');
  goButton.click();
  assert.equal(session.game.state, 'countdown');
});

test('in a conversation the best level is kept under that conversation', async () => {
  const chat = 'aB3_-xYz09aB3_-xYz09aB3_-xYz09aB3_-xYz09aB3';
  const opening = { whenOpened: async () => ({ solo: true, chat, lang: 'en' }) };
  const store = memoryStore({ [`${BEST_LEVEL_KEY}/${chat}`]: '3', [BEST_LEVEL_KEY]: '7' });
  const { session, goButton, keyTarget, play } = await setUp({ store, opening });
  assert.equal(session.game.level, 3);
  assert.deepEqual(session.opened, { solo: true, chat, lang: 'en' });
  goButton.click();
  play(1.6);
  session.game.player.distance = session.game.track.length - 0.05;
  key(keyTarget, 'keydown', 'ArrowUp');
  play(1.8);
  await Promise.resolve();
  assert.equal(session.game.level, 4);
  assert.deepEqual(levelWrites(store), [[`${BEST_LEVEL_KEY}/${chat}`, '4']]);
});

test('a long stop between frames does not jump the race forward', async () => {
  const { session, goButton, play, later } = await setUp();
  goButton.click();
  play(2);
  const before = session.game.raceTime;
  later(8000);
  assert.ok(session.game.raceTime - before <= 0.05);
});

test('the hint shows on level 1 until the first press, and never on later levels', async () => {
  const first = await setUp();
  assert.equal(first.session.hintShown(), true);
  first.goButton.click();
  first.play(1.7);
  assert.equal(first.session.hintShown(), true);
  key(first.keyTarget, 'keydown', 'ArrowUp');
  first.play(0.05);
  assert.equal(first.session.hintShown(), false);
  const later = await setUp({ store: memoryStore({ [BEST_LEVEL_KEY]: '2' }) });
  assert.equal(later.session.hintShown(), false);
});

test('a session that is let go of stops its frames and every listener', async () => {
  const canvas = quietCanvas();
  const goButton = document.createElement('button');
  const keyTarget = new EventTarget();
  const page = Object.assign(new EventTarget(), { visibilityState: 'visible', documentElement: { lang: 'en' } });
  const listening = [counted(canvas), counted(goButton), counted(keyTarget), counted(page)];
  const frames = fakeFrames();
  const session = createSession({ canvas, goButton, keyTarget, page, store: undefined, frames });
  await session.ready;
  frames.run(1000);
  assert.equal(frames.pending.size, 1);
  session.destroy();
  assert.equal(frames.pending.size, 0);
  assert.ok(frames.cancelled.length >= 1);
  for (const counts of listening) {
    for (const [type, count] of counts) assert.equal(count, 0, type);
  }
});

test('the touch ring sits under the finger and fades for a moment after it lifts', async () => {
  const { session, canvas, goButton, play } = await setUp();
  goButton.click();
  play(1.6);
  canvas.dispatchEvent(Object.assign(new Event('pointerdown'), { pointerId: 1, clientX: 150, offsetX: 150, offsetY: 500 }));
  assert.deepEqual(session.touchAt(20), { pressed: true, x: 150, y: 500, time: 20 });
  canvas.dispatchEvent(Object.assign(new Event('pointerup'), { pointerId: 1, clientX: 150, offsetX: 150, offsetY: 500 }));
  play(0.02);
  const released = session.touchAt(session.releasedAt + 0.2);
  assert.deepEqual({ ...released, time: Math.round(released.time * 1000) / 1000 }, { pressed: false, x: 150, y: 500, time: 0.2 });
  assert.equal(session.touchAt(session.releasedAt + 1), null);
});
