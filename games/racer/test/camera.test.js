import { test } from 'vitest';
import assert from 'node:assert/strict';
import { targetZoom, nextZoom } from '../src/camera.js';

const view = { lookAheadPx: 600, scale: 40, minSeconds: 1.6 };

test('the camera does not zoom while enough road is visible ahead', () => {
  assert.equal(targetZoom({ ...view, speed: 5 }), 1);
  assert.equal(targetZoom({ ...view, speed: 0 }), 1);
});

test('at speed the camera zooms out just enough to keep the minimum look-ahead time', () => {
  const zoom = targetZoom({ ...view, speed: 19 });
  const seconds = view.lookAheadPx / (view.scale * zoom) / 19;
  assert.ok(zoom < 1);
  assert.ok(Math.abs(seconds - view.minSeconds) < 1e-9, `${seconds} s`);
});

test('zooming out is immediate and zooming back in is gradual', () => {
  assert.equal(nextZoom(1, 0.6, 1 / 60, 0.5), 0.6);
  assert.ok(Math.abs(nextZoom(0.6, 1, 0.1, 0.5) - 0.65) < 1e-9);
  assert.equal(nextZoom(0.99, 1, 1, 0.5), 1);
});
