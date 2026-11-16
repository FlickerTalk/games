import { test } from 'vitest';
import assert from 'node:assert/strict';
import { PALETTE, drawLevelCard, drawRoad } from '../src/art.js';

function recordingContext() {
  const calls = [];
  const drawing = { calls };
  return new Proxy(drawing, {
    get(target, name) {
      if (name in target) return target[name];
      return (...args) => calls.push({ name, args, fillStyle: target.fillStyle });
    },
    set(target, name, value) {
      target[name] = value;
      return true;
    },
  });
}

test('both trophy handles curve outwards from the cup', () => {
  const ctx = recordingContext();
  drawLevelCard(ctx, { width: 384, height: 853, level: 2, result: 'won' });
  const handles = ctx.calls.filter((call) => call.name === 'arc' && Math.abs(call.args[0]) > 0 && call.args[1] < 0);
  assert.equal(handles.length, 2);
  for (const handle of handles) assert.ok(!handle.args[5], `handle at x ${handle.args[0]} is drawn counter-clockwise`);
});

test('the night city mixes both building colours on a road that has scrolled forward', () => {
  const ctx = recordingContext();
  drawRoad(ctx, { width: 384, height: 853, roadLeft: 54, roadWidth: 276, lanes: 3, scroll: 5000, scenery: 'night' });
  const colours = new Set(ctx.calls.filter((call) => call.name === 'fill').map((call) => call.fillStyle));
  assert.ok(colours.has(PALETTE.building));
  assert.ok(colours.has(PALETTE.buildingAlt));
});

test('each kerb block keeps its colour as the road scrolls, also across exact multiples of its length', () => {
  const seen = new Map();
  for (let scroll = 0; scroll <= 240; scroll += 2.5) {
    const ctx = recordingContext();
    drawRoad(ctx, { width: 384, height: 600, roadLeft: 54, roadWidth: 276, lanes: 3, scroll, scenery: 'meadow' });
    for (const call of ctx.calls.filter((one) => one.name === 'fillRect' && one.args[0] === 55 && one.args[2] === 9)) {
      const block = Math.round((call.args[1] - scroll) / 30);
      if (!seen.has(block)) seen.set(block, call.fillStyle);
      assert.equal(call.fillStyle, seen.get(block), `block ${block} at scroll ${scroll}`);
    }
  }
  assert.ok(seen.size > 20);
});
