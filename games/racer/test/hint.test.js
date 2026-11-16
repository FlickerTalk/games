import { test } from 'vitest';
import assert from 'node:assert/strict';
import { placeHint, HINT_MARGIN, TOUCH_HINT_EXTENT } from '../src/hint.js';
import { drawTouchHint } from '../src/art.js';

const { left, right, up, down } = TOUCH_HINT_EXTENT;

function inside({ x, y, size }, width, height) {
  return x - left * size >= HINT_MARGIN - 1e-9
    && x + right * size <= width - HINT_MARGIN + 1e-9
    && y - up * size >= HINT_MARGIN - 1e-9
    && y + down * size <= height - HINT_MARGIN + 1e-9;
}

function pointTracker() {
  const points = [];
  let matrix = [1, 0, 0, 1, 0, 0];
  const stack = [];
  const at = (x, y) => {
    const [a, b, c, d, e, f] = matrix;
    points.push([a * x + c * y + e, b * x + d * y + f]);
  };
  const multiply = ([a2, b2, c2, d2, e2, f2]) => {
    const [a, b, c, d, e, f] = matrix;
    matrix = [a * a2 + c * b2, b * a2 + d * b2, a * c2 + c * d2, b * c2 + d * d2, a * e2 + c * f2 + e, b * e2 + d * f2 + f];
  };
  const methods = {
    save: () => stack.push(matrix),
    restore: () => {
      matrix = stack.pop();
    },
    translate: (x, y) => multiply([1, 0, 0, 1, x, y]),
    rotate: (angle) => multiply([Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0]),
    moveTo: at,
    lineTo: at,
    quadraticCurveTo: (x1, y1, x, y) => [[x1, y1], [x, y]].forEach(([px, py]) => at(px, py)),
    bezierCurveTo: (x1, y1, x2, y2, x, y) => [[x1, y1], [x2, y2], [x, y]].forEach(([px, py]) => at(px, py)),
    arcTo: (x1, y1, x2, y2) => [[x1, y1], [x2, y2]].forEach(([px, py]) => at(px, py)),
    ellipse: (x, y, radiusX, radiusY) => [[x - radiusX, y - radiusY], [x + radiusX, y + radiusY], [x - radiusX, y + radiusY], [x + radiusX, y - radiusY]].forEach(([px, py]) => at(px, py)),
  };
  const ctx = new Proxy({}, {
    get: (target, name) => methods[name] ?? (name in target ? target[name] : () => {}),
    set: (target, name, value) => {
      target[name] = value;
      return true;
    },
  });
  return { ctx, points };
}

test('the designer\'s hand never leaves the extent the placement counts on, wherever it slides', () => {
  const size = 80;
  for (let time = 0; time < 3; time += 0.07) {
    const { ctx, points } = pointTracker();
    drawTouchHint(ctx, 300, 300, size, { time });
    assert.ok(points.length > 20);
    for (const [x, y] of points) {
      assert.ok(x >= 300 - left * size && x <= 300 + right * size, `x ${x} at ${time}`);
      assert.ok(y >= 300 - up * size && y <= 300 + down * size, `y ${y} at ${time}`);
    }
  }
});

test('with room below the car the hint sits under it at full size', () => {
  const spot = placeHint({ width: 384, height: 853, carX: 150, carBottom: 600 });
  assert.equal(spot.size, 96);
  assert.ok(spot.y - up * spot.size >= 600);
  assert.equal(spot.x, 150);
  assert.ok(inside(spot, 384, 853));
});

test('on a short screen the hint shrinks so that it still fits under the car', () => {
  const spot = placeHint({ width: 360, height: 560, carX: 140, carBottom: 460 });
  assert.ok(spot.size < 96);
  assert.ok(spot.y - up * spot.size >= 460, JSON.stringify(spot));
  assert.ok(inside(spot, 360, 560));
});

test('the whole hint stays on screen for every size and every car position', () => {
  for (const [width, height] of [[384, 760], [360, 560], [462, 700], [226, 343], [280, 420]]) {
    for (const carX of [0, width * 0.15, width / 2, width * 0.85, width]) {
      for (const carBottom of [height * 0.6, height * 0.85, height]) {
        const spot = placeHint({ width, height, carX, carBottom });
        assert.ok(inside(spot, width, height), JSON.stringify({ width, height, carX, carBottom, spot }));
        assert.ok(spot.size >= 40);
      }
    }
  }
});
