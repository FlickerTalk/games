import { test, beforeEach, vi } from 'vitest';
import assert from 'node:assert/strict';
import * as art from '../src/art.js';
import { drawHud, drawTouch } from '../src/draw-hud.js';
import { createGame, pressGo, stepGame, pauseRace } from '../src/game.js';
import { RACE } from '../src/tuning.js';
import { SWITCH_ROOM } from '../src/layout.js';

vi.mock('../src/art.js', async (importOriginal) => {
  const real = await importOriginal();
  return Object.fromEntries(Object.entries(real).map(([name, value]) => [name, typeof value === 'function' ? vi.fn(value) : value]));
});

const quiet = new Proxy({}, {
  get: (target, name) => (name in target ? target[name] : () => {}),
  set: (target, name, value) => {
    target[name] = value;
    return true;
  },
});
const view = { width: 384, height: 760, offsetX: 0, dpr: 1, scale: 38.4, zoom: 1 };
const noHint = { hint: false, touch: null };

beforeEach(() => vi.clearAllMocks());

function stepped(seconds) {
  const game = createGame({ seed: 3 });
  pressGo(game);
  for (let t = 0; t < seconds; t += 1 / 60) stepGame(game, { accelerate: false, steer: 0, targetX: null }, 1 / 60);
  return game;
}

const light = () => Math.floor(art.drawCountdown.mock.calls.at(-1).at(-1).time % 4);

test('during the race the progress strip is the only thing drawn over the road', () => {
  const game = stepped(RACE.countdownSeconds + 1);
  drawHud(quiet, view, game, 9, noHint);
  assert.equal(art.drawProgressStrip.mock.calls.length, 1);
  assert.equal(art.drawCountdown.mock.calls.length, 0);
  assert.equal(art.drawTouchHint.mock.calls.length, 0);
});

test('the start lights go red, then amber, then green as the race starts, and dark while paused', () => {
  drawHud(quiet, view, stepped(0.1), 0, noHint);
  assert.equal(light(), 0);
  drawHud(quiet, view, stepped(RACE.countdownSeconds * 0.75), 0, noHint);
  assert.equal(light(), 1);
  drawHud(quiet, view, stepped(RACE.countdownSeconds + 0.1), 0, noHint);
  assert.equal(light(), 2);
  const paused = stepped(RACE.countdownSeconds + 1);
  pauseRace(paused);
  drawHud(quiet, view, paused, 0, noHint);
  assert.equal(light(), 3);
});

test('the hand shows in the countdown when asked for, and always while paused', () => {
  drawHud(quiet, view, stepped(0.5), 0, { hint: true, touch: null });
  assert.equal(art.drawTouchHint.mock.calls.length, 1);
  const paused = stepped(RACE.countdownSeconds + 1);
  pauseRace(paused);
  drawHud(quiet, view, paused, 0, noHint);
  assert.equal(art.drawTouchHint.mock.calls.length, 2);
  drawHud(quiet, view, stepped(RACE.countdownSeconds + 1), 0, noHint);
  assert.equal(art.drawTouchHint.mock.calls.length, 2);
});

test('the touch ring is drawn where the finger is, anywhere on the game', () => {
  drawTouch(quiet, { ...view, offsetX: 400 }, { pressed: true, x: 50, y: 300, time: 2 });
  assert.deepEqual(art.drawTouchPoint.mock.calls[0].slice(1), [50, 300, { pressed: true, time: 2 }]);
  drawTouch(quiet, view, null);
  drawTouch(quiet, view, { pressed: false, x: null, y: null, time: 0.1 });
  assert.equal(art.drawTouchPoint.mock.calls.length, 1);
});

test('the progress strip shows the chosen vehicle', () => {
  drawHud(quiet, view, stepped(RACE.countdownSeconds + 1), 0, { ...noHint, vehicle: { kind: 'kart', color: 'coral' } });
  assert.deepEqual(art.drawProgressStrip.mock.calls[0][6], { kind: 'kart', color: 'coral' });
});

test('in a race with a friend the strip follows the friend and shows their vehicle', () => {
  const game = createGame({ level: 1, seed: 3, robot: false });
  pressGo(game);
  for (let t = 0; t < RACE.countdownSeconds + 1; t += 1 / 60) stepGame(game, { accelerate: true, steer: 0, targetX: null }, 1 / 60);
  const rival = { distance: game.track.length / 2, x: 0, speed: 8, kind: 'bus', color: 'mint', braking: false };
  drawHud(quiet, view, game, 0, { ...noHint, vehicle: { kind: 'car', color: 'ocean' }, rival });
  const call = art.drawProgressStrip.mock.calls[0];
  assert.equal(call[5].robot, 0.5);
  assert.deepEqual(call[7], { kind: 'bus', color: 'mint' });
});

test('the progress strip leaves the top corners to the sound and music switches', () => {
  for (const width of [320, 360, 384, 520]) {
    vi.clearAllMocks();
    drawHud(quiet, { ...view, width, scale: width / 10 }, stepped(RACE.countdownSeconds + 1), 0, noHint);
    const [, x, , stripWidth] = art.drawProgressStrip.mock.calls[0];
    assert.ok(x >= SWITCH_ROOM, `${width}: ${x}`);
    assert.ok(x + stripWidth <= width - SWITCH_ROOM, `${width}: ${x + stripWidth}`);
  }
});

test('in a race of a minute or more the progress strip marks the halfway point', () => {
  const long = createGame({ level: 7, seed: 3 });
  pressGo(long);
  drawHud(quiet, view, long, 0, noHint);
  assert.deepEqual(art.drawProgressStrip.mock.calls[0][8], { halfway: 0.5 });
  vi.clearAllMocks();
  drawHud(quiet, view, stepped(RACE.countdownSeconds + 1), 0, noHint);
  assert.deepEqual(art.drawProgressStrip.mock.calls[0][8], { halfway: null });
});
