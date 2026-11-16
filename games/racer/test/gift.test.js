import { test } from 'vitest';
import assert from 'node:assert/strict';
import { drawGiftReveal, GIFT_REVEAL_SECONDS, VEHICLE_KINDS } from '../src/art.js';
import { pointTracker, bounds } from './point-tracker.js';

const SIZES = [[226, 343], [360, 640], [462, 700], [384, 853]];

test('the reveal lasts under three seconds and then holds its last picture', () => {
  assert.ok(GIFT_REVEAL_SECONDS > 1 && GIFT_REVEAL_SECONDS < 3);
  const end = pointTracker();
  const later = pointTracker();
  drawGiftReveal(end.ctx, { width: 360, height: 640, kind: 'rocket', time: GIFT_REVEAL_SECONDS });
  drawGiftReveal(later.ctx, { width: 360, height: 640, kind: 'rocket', time: GIFT_REVEAL_SECONDS + 5 });
  assert.deepEqual(later.points, end.points);
});

const BACKDROP_POINTS = 12;

test('the present, its lid and the vehicle that pops out stay on screen at every size', () => {
  for (const [width, height] of SIZES) {
    for (const kind of VEHICLE_KINDS) {
      for (let time = 0; time <= GIFT_REVEAL_SECONDS; time += 0.2) {
        const { ctx, points } = pointTracker();
        drawGiftReveal(ctx, { width, height, kind, color: 'mint', time });
        const edge = bounds(points.slice(BACKDROP_POINTS));
        assert.ok(edge.left >= -1 && edge.top >= -1 && edge.right <= width + 1 && edge.bottom <= height + 1, `${kind} ${width}x${height} at ${time}: ${JSON.stringify(edge)}`);
      }
    }
  }
});
