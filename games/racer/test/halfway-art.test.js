import { test } from 'vitest';
import assert from 'node:assert/strict';
import { drawProgressStrip, drawHalfwayBand, PALETTE } from '../src/art.js';
import { pointTracker, bounds } from './point-tracker.js';

test('the halfway band crosses the whole road in the game\'s yellow, with a pennant on each side', () => {
  const { ctx, points, fills } = pointTracker();
  drawHalfwayBand(ctx, 50, 300, 280);
  const edge = bounds(points);
  assert.ok(edge.left < 50 && edge.right > 330, JSON.stringify(edge));
  assert.ok(edge.top < 300 && edge.bottom > 300 && edge.bottom - edge.top < 140, JSON.stringify(edge));
  assert.ok(fills.includes(PALETTE.player));
});

test('the progress strip draws a mark at the halfway point only when it is asked to', () => {
  const plain = pointTracker();
  drawProgressStrip(plain.ctx, 10, 10, 280, 58, { player: 0.2, robot: 0.1 }, {});
  const marked = pointTracker();
  drawProgressStrip(marked.ctx, 10, 10, 280, 58, { player: 0.2, robot: 0.1 }, {}, null, { halfway: 0.5 });
  assert.ok(marked.points.length > plain.points.length);
  const extra = marked.points.filter(([x, y]) => !plain.points.some(([px, py]) => Math.abs(px - x) < 1e-9 && Math.abs(py - y) < 1e-9));
  const middle = (Math.min(...extra.map(([x]) => x)) + Math.max(...extra.map(([x]) => x))) / 2;
  assert.ok(middle > 120 && middle < 180, `${middle}`);
});
