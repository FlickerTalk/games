import { test, vi } from 'vitest';
import assert from 'node:assert/strict';
import * as art from '../src/art.js';
import { soundSwitchPlaces, stageFor } from '../src/layout.js';
import { drawHud } from '../src/draw-hud.js';
import { createGame, pressGo, stepGame } from '../src/game.js';

vi.mock('../src/art.js', async (importOriginal) => {
  const real = await importOriginal();
  return Object.fromEntries(Object.entries(real).map(([name, value]) => [name, typeof value === 'function' ? vi.fn(value) : value]));
});

const AREAS = [[360, 640], [384, 853], [430, 932], [1248, 690]];
const quiet = new Proxy({}, { get: (target, name) => (name in target ? target[name] : () => {}), set: (target, name, value) => ((target[name] = value), true) });
const overlap = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const square = ({ x, y, size }) => ({ x, y, width: size, height: size });

function stripOn(area) {
  const stage = stageFor(area);
  const game = createGame({ seed: 3 });
  pressGo(game);
  for (let t = 0; t < 2; t += 1 / 60) stepGame(game, { accelerate: true, steer: 0, targetX: null }, 1 / 60);
  art.drawProgressStrip.mockClear();
  drawHud(quiet, { width: stage.width, height: stage.height, offsetX: stage.x, dpr: 1, scale: stage.width / 10, zoom: 1 }, game, 0, { hint: false, touch: null });
  const [, x, y, width, height] = art.drawProgressStrip.mock.calls[0];
  return { x: stage.x + x, y, width, height };
}

test('in full screen on phones and the tablet the switches and the volume line clear the strip and the garage button', () => {
  for (const [width, height] of AREAS) {
    const area = { width, height };
    const stage = stageFor(area);
    const { sound, music, volume } = soundSwitchPlaces(area);
    const line = { x: volume.x, y: volume.y, width: volume.width, height: volume.length };
    const garage = art.levelCardGarageButton(stage.width, stage.height);
    const garageOnScreen = { ...garage, x: garage.x + stage.x };
    const strip = stripOn(area);
    for (const [name, box] of [['sound', square(sound)], ['music', square(music)], ['volume', line]]) {
      assert.ok(!overlap(box, strip), `${width}x${height}: ${name} on the strip`);
      assert.ok(!overlap(box, garageOnScreen), `${width}x${height}: ${name} on the garage button`);
      assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= width && box.y + box.height <= height, `${width}x${height}: ${name} off screen`);
    }
    assert.ok(!overlap(square(sound), square(music)));
  }
});
