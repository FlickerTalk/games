import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createRenderer } from '../src/render.js';
import { createGame, pressGo, stepGame, pauseRace } from '../src/game.js';
import { sceneryFor, groundColor } from '../src/scenery.js';
import { CAMERA, PLAYER_SCREEN_POSITION, VIEW_WIDTH } from '../src/tuning.js';
import { PALETTE, levelCardGoButton } from '../src/art.js';

const PHONE = { width: 384, height: 853, stage: { x: 0, width: 384, height: 853 } };
const TABLET = { width: 1248, height: 700, stage: { x: 400, width: 448, height: 700 } };

function recordingCanvas() {
  const calls = [];
  const drawing = { calls };
  const ctx = new Proxy(drawing, {
    get(target, name) {
      if (name in target) return target[name];
      return (...args) => calls.push({ name, args, fillStyle: target.fillStyle, strokeStyle: target.strokeStyle });
    },
    set(target, name, value) {
      target[name] = value;
      return true;
    },
  });
  return { width: 0, height: 0, ctx, getContext: () => ctx };
}

function setUp(level, area = PHONE) {
  const canvas = recordingCanvas();
  const renderer = createRenderer(canvas);
  renderer.resize({ ...area, dpr: 2 });
  return { canvas, renderer, game: createGame({ level }) };
}

const hud = { hint: false };
const filled = (canvas, color) => canvas.ctx.calls.some((call) => call.name.startsWith('fill') && call.fillStyle === color);
const stroked = (canvas, color) => canvas.ctx.calls.some((call) => call.name === 'stroke' && call.strokeStyle === color);

function race(game, seconds) {
  pressGo(game);
  for (let t = 0; t < seconds; t += 1 / 60) stepGame(game, { accelerate: true, steer: 0, targetX: null }, 1 / 60);
}

test('the canvas backing store covers the whole area at the device pixel ratio', () => {
  const { canvas } = setUp(1, TABLET);
  assert.equal(canvas.width, 2496);
  assert.equal(canvas.height, 1400);
});

test('during a race the ground is painted in the scenery colour of the level', () => {
  const { canvas, renderer, game } = setUp(2);
  race(game, 3);
  renderer.draw(game, 3, hud);
  assert.ok(filled(canvas, groundColor(sceneryFor(2))));
  assert.ok(!filled(canvas, PALETTE.sky));
});

test('on a wide area the ground colour fills everything around the portrait stage', () => {
  const { canvas, renderer, game } = setUp(3, TABLET);
  race(game, 2);
  renderer.draw(game, 2, hud);
  const ground = canvas.ctx.calls.find((call) => call.name === 'fillRect' && call.fillStyle === groundColor(sceneryFor(3)));
  assert.deepEqual(ground.args, [0, 0, 1248, 700]);
  assert.equal(renderer.pixelsPerUnit(), 448 / VIEW_WIDTH);
});

test('while the stored level is still loading only a plain sky is drawn', () => {
  const { canvas, renderer } = setUp(1);
  renderer.draw(null, 0, hud);
  assert.ok(filled(canvas, PALETTE.sky));
  assert.ok(!filled(canvas, PALETTE.trophy));
});

test('while waiting for go the level card shows the result of the last race', () => {
  const { canvas, renderer, game } = setUp(1);
  game.lastResult = 'won';
  renderer.draw(game, 0, hud);
  assert.ok(filled(canvas, PALETTE.sky));
  assert.ok(filled(canvas, PALETTE.trophy));
});

test('every moment of the game can be drawn in every scenery, with and without the hint', () => {
  for (const level of [1, 2, 3, 4]) {
    const { canvas, renderer, game } = setUp(level, TABLET);
    renderer.draw(game, 0, hud);
    race(game, 4);
    game.player.bumpTimer = 0.4;
    game.track.hazards[0].knocked = true;
    renderer.draw(game, 4, { hint: true });
    Object.assign(game, { state: 'finished', lastResult: 'lost', timer: 1 });
    renderer.draw(game, 5, hud);
    assert.ok(canvas.ctx.calls.length > 200);
  }
});

test('the touch hint is drawn only when asked for and only once the race is under way', () => {
  const waiting = setUp(1);
  waiting.renderer.draw(waiting.game, 0, { hint: true });
  assert.ok(!filled(waiting.canvas, PALETTE.skin));
  const counting = setUp(1);
  pressGo(counting.game);
  counting.renderer.draw(counting.game, 0.2, { hint: true });
  assert.ok(filled(counting.canvas, PALETTE.skin));
  const plain = setUp(1);
  pressGo(plain.game);
  plain.renderer.draw(plain.game, 0.2, hud);
  assert.ok(!filled(plain.canvas, PALETTE.skin));
});

test('the go button sits where the level card draws it, in the stage', () => {
  const { renderer } = setUp(1, TABLET);
  const expected = levelCardGoButton(448, 700);
  const button = renderer.goButton();
  assert.equal(button.x, expected.x + 400);
  assert.equal(button.y, expected.y);
  assert.equal(button.width, expected.width);
  assert.equal(button.centerX, expected.centerX + 400);
});

test('at rest, one road unit is a tenth of the stage width', () => {
  const { renderer, game } = setUp(1);
  renderer.draw(game, 0, hud);
  assert.equal(renderer.pixelsPerUnit(), 384 / VIEW_WIDTH);
});

test('at top speed the camera zooms out to keep enough road visible ahead', () => {
  const { renderer, game } = setUp(9);
  race(game, 0.1);
  game.player.speed = game.settings.topSpeed;
  renderer.draw(game, 1, hud);
  const scale = (384 / VIEW_WIDTH) * renderer.zoom;
  const visibleAhead = 853 * PLAYER_SCREEN_POSITION - renderer.hudBottom();
  const seconds = visibleAhead / scale / game.settings.topSpeed;
  assert.ok(renderer.zoom < 1);
  assert.ok(seconds >= CAMERA.minLookAheadSeconds - 1e-9, `${seconds} s`);
  assert.ok(Math.abs(renderer.pixelsPerUnit() - scale) < 1e-9);
});

test('a paused race shows the pressing hand, hint asked for or not', () => {
  const { canvas, renderer, game } = setUp(2);
  race(game, 2);
  pauseRace(game);
  renderer.draw(game, 3, hud);
  assert.ok(filled(canvas, PALETTE.skin));
});

test('the finger\'s touch ring is drawn over the race', () => {
  const { canvas, renderer, game } = setUp(1);
  race(game, 2);
  renderer.draw(game, 3, { hint: false, touch: { pressed: true, x: 100, y: 500, time: 3 } });
  assert.ok(stroked(canvas, PALETTE.playerGlass));
});
