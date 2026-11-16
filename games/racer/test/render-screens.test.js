import { test, beforeEach, vi } from 'vitest';
import assert from 'node:assert/strict';
import * as art from '../src/art.js';
import { createRenderer } from '../src/render.js';
import { createGame } from '../src/game.js';

vi.mock('../src/art.js', async (importOriginal) => {
  const real = await importOriginal();
  return Object.fromEntries(Object.entries(real).map(([name, value]) => [name, typeof value === 'function' ? vi.fn(value) : value]));
});

const TABLET = { width: 1248, height: 700, stage: { x: 400, width: 448, height: 700 } };
const quiet = new Proxy({ measureText: () => ({ width: 10 }) }, {
  get: (target, name) => (name in target ? target[name] : () => {}),
  set: (target, name, value) => {
    target[name] = value;
    return true;
  },
});

beforeEach(() => vi.clearAllMocks());

function setUp() {
  const renderer = createRenderer({ width: 0, height: 0, getContext: () => quiet });
  renderer.resize({ ...TABLET, dpr: 2 });
  return { renderer, game: createGame({ level: 3 }) };
}

test('the garage takes the whole area and nothing of the race or the card is drawn under it', () => {
  const { renderer, game } = setUp();
  const view = { kinds: art.VEHICLE_KINDS, unlocked: ['car'], selected: 'car', color: 'ocean', page: 0, time: 1, nudge: null };
  renderer.draw(game, 1, { screen: { name: 'garage', view } });
  assert.deepEqual(art.drawGarage.mock.calls[0][1], { width: 1248, height: 700, ...view });
  assert.equal(art.drawLevelCard.mock.calls.length, 0);
  assert.deepEqual(renderer.screenSize(), { width: 1248, height: 700 });
});

test('the gift is revealed on the portrait stage, like the level card that follows it', () => {
  const { renderer, game } = setUp();
  renderer.draw(game, 1, { screen: { name: 'gift', view: { kind: 'rocket', color: 'mint', time: 0.5 } } });
  assert.deepEqual(art.drawGiftReveal.mock.calls[0][1], { width: 448, height: 700, kind: 'rocket', color: 'mint', time: 0.5 });
  assert.equal(art.drawLevelCard.mock.calls.length, 0);
});

test('the level card shows the chosen vehicle and its garage button is found in canvas coordinates', () => {
  const { renderer, game } = setUp();
  renderer.draw(game, 1, { vehicle: { kind: 'bus', color: 'coral' } });
  assert.deepEqual(art.drawLevelCard.mock.calls[0][1].vehicle, { kind: 'bus', color: 'coral' });
  const expected = art.levelCardGarageButton(448, 700);
  assert.deepEqual(renderer.garageButton(), { ...expected, x: expected.x + 400, centerX: expected.centerX + 400 });
});

test('the garage button asks to be noticed only on the first card, and only while asked to', () => {
  const { renderer, game } = setUp();
  renderer.draw(game, 1, { garageHint: true });
  assert.equal(art.drawLevelCard.mock.calls.at(-1)[1].garageHint, true);
  renderer.draw(game, 1, { garageHint: false });
  assert.equal(art.drawLevelCard.mock.calls.at(-1)[1].garageHint, false);
  game.lastResult = 'won';
  renderer.draw(game, 1, { garageHint: true });
  assert.equal(art.drawLevelCard.mock.calls.at(-1)[1].garageHint, false);
});
