import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createControls } from '../src/controls.js';

const EDGE = 2.83;

function fire(target, type, props = {}) {
  target.dispatchEvent(Object.assign(new Event(type), props));
}

function setup({ carX = 0 } = {}) {
  const page = new EventTarget();
  const surface = new EventTarget();
  const view = { pixelsPerUnit: 40 };
  const car = { x: carX };
  const controls = createControls({
    eventTarget: page,
    surface,
    carX: () => car.x,
    clampX: (x) => Math.max(-EDGE, Math.min(EDGE, x)),
    toRoadUnits: (pixels) => pixels / view.pixelsPerUnit,
  });
  const finger = (type, pointerId, clientX) => fire(surface, type, { pointerId, clientX });
  return { page, surface, controls, view, car, finger };
}

test('nothing pressed means coasting straight on', () => {
  const { controls } = setup();
  assert.deepEqual(controls.read(), { accelerate: false, steer: 0, targetX: null });
  assert.equal(controls.pressing, false);
});

test('a finger held down accelerates and lifting it coasts in the same lane', () => {
  const { controls, finger } = setup({ carX: 1 });
  finger('pointerdown', 1, 200);
  assert.equal(controls.read().accelerate, true);
  assert.equal(controls.pressing, true);
  finger('pointerup', 1, 200);
  assert.deepEqual(controls.read(), { accelerate: false, steer: 0, targetX: null });
});

test('pressing far from the car does not make it jump', () => {
  const { controls, finger } = setup({ carX: 1.5 });
  finger('pointerdown', 1, 20);
  assert.equal(controls.read().targetX, 1.5);
});

test('dragging moves the car by the distance the finger travelled, kept on the road', () => {
  const { controls, finger } = setup({ carX: 1.5 });
  finger('pointerdown', 1, 100);
  finger('pointermove', 1, 60);
  assert.equal(controls.read().targetX, 0.5);
  finger('pointermove', 1, 180);
  assert.equal(controls.read().targetX, EDGE);
});

test('at the road edge, dragging back moves the car at once', () => {
  const { controls, finger } = setup({ carX: 2 });
  finger('pointerdown', 1, 100);
  finger('pointermove', 1, 300);
  assert.equal(controls.read().targetX, EDGE);
  finger('pointermove', 1, 260);
  assert.ok(Math.abs(controls.read().targetX - (EDGE - 1)) < 1e-9, `${controls.read().targetX}`);
  finger('pointermove', 1, -400);
  assert.equal(controls.read().targetX, -EDGE);
  finger('pointermove', 1, -360);
  assert.ok(Math.abs(controls.read().targetX - (1 - EDGE)) < 1e-9);
});

test('controls that are let go of stop listening', () => {
  const { page, controls, finger } = setup();
  controls.destroy();
  finger('pointerdown', 1, 100);
  fire(page, 'keydown', { key: 'ArrowUp' });
  assert.deepEqual(controls.read(), { accelerate: false, steer: 0, targetX: null });
});

test('distance already dragged keeps its length when the camera zooms', () => {
  const { controls, finger, view } = setup({ carX: 0 });
  finger('pointerdown', 1, 100);
  finger('pointermove', 1, 140);
  view.pixelsPerUnit = 20;
  assert.equal(controls.read().targetX, 1);
  finger('pointermove', 1, 160);
  assert.equal(controls.read().targetX, 2);
});

test('a second finger is ignored while the first one is down', () => {
  const { controls, finger } = setup({ carX: 0 });
  finger('pointerdown', 1, 100);
  finger('pointerdown', 2, 300);
  finger('pointermove', 2, 380);
  assert.equal(controls.read().targetX, 0);
  finger('pointerup', 2, 380);
  assert.equal(controls.pressing, true);
  finger('pointerup', 1, 100);
  assert.equal(controls.pressing, false);
});

test('a new press starts from where the car is now', () => {
  const { controls, finger, car } = setup({ carX: 0 });
  finger('pointerdown', 1, 100);
  finger('pointermove', 1, 140);
  finger('pointerup', 1, 140);
  car.x = 0.9;
  finger('pointerdown', 3, 300);
  assert.equal(controls.read().targetX, 0.9);
});

test('a cancelled or lost finger counts as lifted', () => {
  const { controls, finger, surface } = setup();
  finger('pointerdown', 1, 100);
  finger('pointercancel', 1, 100);
  assert.equal(controls.pressing, false);
  finger('pointerdown', 2, 100);
  fire(surface, 'lostpointercapture', { pointerId: 2 });
  assert.equal(controls.pressing, false);
});

test('arrow keys and A/D steer, up arrow and space accelerate', () => {
  const { page, controls } = setup();
  fire(page, 'keydown', { key: 'ArrowLeft' });
  assert.equal(controls.read().steer, -1);
  fire(page, 'keyup', { key: 'ArrowLeft' });
  fire(page, 'keydown', { key: 'd' });
  assert.equal(controls.read().steer, 1);
  fire(page, 'keydown', { key: ' ' });
  assert.equal(controls.read().accelerate, true);
  fire(page, 'keyup', { key: ' ' });
  fire(page, 'keydown', { key: 'ArrowUp' });
  assert.equal(controls.read().accelerate, true);
  fire(page, 'blur');
  assert.deepEqual(controls.read(), { accelerate: false, steer: 0, targetX: null });
});

test('a steering key takes over from the finger while it is held', () => {
  const { page, controls, finger } = setup();
  finger('pointerdown', 1, 100);
  fire(page, 'keydown', { key: 'ArrowRight' });
  assert.deepEqual(controls.read(), { accelerate: true, steer: 1, targetX: null });
});

test('each new press counts once: a finger down, or a go key that was not already held', () => {
  const { page, controls, finger } = setup();
  assert.equal(controls.presses, 0);
  finger('pointerdown', 1, 100);
  finger('pointerdown', 2, 200);
  assert.equal(controls.presses, 1);
  finger('pointerup', 1, 100);
  finger('pointerdown', 3, 100);
  assert.equal(controls.presses, 2);
  fire(page, 'keydown', { key: 'ArrowUp' });
  fire(page, 'keydown', { key: 'ArrowUp', repeat: true });
  fire(page, 'keydown', { key: 'ArrowLeft' });
  assert.equal(controls.presses, 3);
});

test('where the finger is on the game is known while it is down, and kept after it lifts', () => {
  const { surface, controls } = setup();
  assert.deepEqual(controls.touch, { pressed: false, x: null, y: null });
  fire(surface, 'pointerdown', { pointerId: 1, clientX: 300, offsetX: 120, offsetY: 400 });
  assert.deepEqual(controls.touch, { pressed: true, x: 120, y: 400 });
  fire(surface, 'pointermove', { pointerId: 1, clientX: 280, offsetX: 100, offsetY: 410 });
  fire(surface, 'pointermove', { pointerId: 2, clientX: 10, offsetX: 5, offsetY: 5 });
  assert.deepEqual(controls.touch, { pressed: true, x: 100, y: 410 });
  fire(surface, 'pointerup', { pointerId: 1, clientX: 280, offsetX: 100, offsetY: 410 });
  assert.deepEqual(controls.touch, { pressed: false, x: 100, y: 410 });
});

test('each lift of the finger is counted, even between two frames', () => {
  const { controls, finger } = setup();
  assert.equal(controls.releases, 0);
  finger('pointerdown', 1, 100);
  finger('pointerdown', 2, 100);
  finger('pointerup', 2, 100);
  assert.equal(controls.releases, 0);
  finger('pointerup', 1, 100);
  finger('pointerdown', 3, 100);
  finger('pointercancel', 3, 100);
  assert.equal(controls.releases, 2);
});
