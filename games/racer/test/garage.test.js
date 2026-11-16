import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  VEHICLE_KINDS, VEHICLE_COLORS, PALETTE, drawGarage, drawGarageButton, garageTiles, garageColorDots, garageDoneButton, garagePageButtons, garagePageCount,
} from '../src/art.js';
import { pointTracker, bounds } from './point-tracker.js';
import { SWITCH_BAND } from '../src/layout.js';

const ROOMY = [[360, 640], [384, 853], [430, 932], [1248, 690], [360, 560], [384, 760], [1280, 728], [390, 520], [360, 343], [800, 503]];
const TIGHT = [[320, 240], [480, 240]];

const EDGE = 1e-6;
const overlap = (a, b) => a.x < b.x + b.width - EDGE && b.x < a.x + a.width - EDGE && a.y < b.y + b.height - EDGE && b.y < a.y + a.height - EDGE;
const inside = (box, width, height) => box.x >= 0 && box.y >= 0 && box.x + box.width <= width + 1e-9 && box.y + box.height <= height + 1e-9;

function everything(width, height) {
  const pages = garagePageCount(width, height, VEHICLE_KINDS);
  const tiles = Array.from({ length: pages }, (_, page) => garageTiles(width, height, VEHICLE_KINDS, page));
  const { previous, next } = garagePageButtons(width, height);
  const controls = [...garageColorDots(width, height), garageDoneButton(width, height), ...(pages > 1 ? [previous, next] : [])];
  return { pages, tiles, controls };
}

test('every vehicle is on exactly one page, and tall phones and the tablet need no paging', () => {
  for (const [width, height] of [...ROOMY, ...TIGHT]) {
    const { tiles, pages } = everything(width, height);
    assert.deepEqual(tiles.flat().map((tile) => tile.kind), [...VEHICLE_KINDS], `${width}x${height}`);
    assert.ok(tiles.every((page) => page.length > 0), `${width}x${height}: ${pages} pages`);
  }
  for (const [width, height] of [[384, 853], [430, 932], [1248, 690], [800, 503]]) {
    assert.equal(garagePageCount(width, height, VEHICLE_KINDS), 1, `${width}x${height}`);
  }
});

test('tiles are big enough for a small finger and nothing on the garage overlaps or leaves the screen', () => {
  for (const [width, height] of [...ROOMY, ...TIGHT]) {
    const { tiles, controls } = everything(width, height);
    const smallest = ROOMY.some(([w, h]) => w === width && h === height) ? 96 : 64;
    for (const page of tiles) {
      const boxes = [...page, ...controls];
      boxes.forEach((box, index) => {
        assert.ok(inside(box, width, height), `${width}x${height}: ${JSON.stringify(box)}`);
        for (const other of boxes.slice(index + 1)) assert.ok(!overlap(box, other), `${width}x${height}: ${JSON.stringify([box, other])}`);
      });
      for (const tile of page) assert.ok(tile.width >= smallest && tile.height >= smallest, `${width}x${height}: ${tile.width}x${tile.height}`);
    }
  }
});

test('the colour dots and the round buttons are easy to hit', () => {
  for (const [width, height] of ROOMY) {
    const { controls } = everything(width, height);
    for (const control of controls) assert.ok(control.width >= 44 && control.height >= 44, `${width}x${height}: ${JSON.stringify(control)}`);
  }
});

test('the garage is drawn inside its screen on every page', () => {
  for (const [width, height] of [...ROOMY, ...TIGHT]) {
    for (let page = 0; page < garagePageCount(width, height, VEHICLE_KINDS); page += 1) {
      const { ctx, points } = pointTracker();
      drawGarage(ctx, { width, height, kinds: VEHICLE_KINDS, unlocked: VEHICLE_KINDS.slice(0, 5), selected: 'bus', color: 'ocean', time: 1.3, page });
      const edge = bounds(points.slice(12));
      assert.ok(edge.left >= -2 && edge.top >= -2 && edge.right <= width + 2 && edge.bottom <= height + 2, `${width}x${height} page ${page}: ${JSON.stringify(edge)}`);
    }
  }
});

test('a tapped present gives a little shake and calms down again', () => {
  const draw = (nudge) => {
    const { ctx, points } = pointTracker();
    drawGarage(ctx, { width: 360, height: 640, kinds: VEHICLE_KINDS, unlocked: VEHICLE_KINDS.slice(0, 5), selected: 'car', color: 'ocean', time: 0.9, page: 0, nudge });
    return points;
  };
  const calm = draw(null);
  assert.notDeepEqual(draw({ kind: 'rocket', progress: 0.2 }), calm);
  assert.deepEqual(draw({ kind: 'rocket', progress: 1 }), calm);
  assert.deepEqual(draw({ kind: 'car', progress: 0.2 }), calm);
});

function paintedDots(selected) {
  const dotColors = new Set(VEHICLE_COLORS.map((entry) => entry.value));
  const seen = [];
  const { ctx } = pointTracker();
  const watched = new Proxy(ctx, {
    get: (target, name) => (name === 'fill' ? () => seen.push({ fill: target.fillStyle, alpha: target.globalAlpha ?? 1 }) : target[name]),
    set: (target, name, value) => {
      target[name] = value;
      return true;
    },
  });
  drawGarage(watched, { width: 360, height: 640, kinds: VEHICLE_KINDS, unlocked: VEHICLE_KINDS, selected, color: 'ocean', time: 0, page: 0 });
  const dots = garageColorDots(360, 640).length;
  return { dots: seen.filter(({ fill }) => dotColors.has(fill)).slice(-dots), checks: seen.filter(({ fill }) => fill === PALETTE.greenLight).length };
}

test('with the police car or the fire engine chosen the colour dots fade and show no choice', () => {
  for (const kind of ['police', 'firetruck']) {
    const { dots, checks } = paintedDots(kind);
    assert.ok(dots.every(({ alpha }) => alpha < 0.5), kind);
    assert.equal(checks, 1, kind);
  }
  const { dots, checks } = paintedDots('bus');
  assert.ok(dots.every(({ alpha }) => alpha === 1));
  assert.equal(checks, 2);
});

test('the garage button shows the vehicle being driven inside a round swap arrow and stays inside its circle', () => {
  const { ctx, points, fills } = pointTracker();
  drawGarageButton(ctx, 100, 100, 80, { kind: 'tractor', color: 'lavender' });
  assert.ok(fills.includes(VEHICLE_COLORS[5].value));
  const edge = bounds(points);
  assert.ok(edge.left >= 58 && edge.right <= 142 && edge.top >= 58 && edge.bottom <= 146, JSON.stringify(edge));
});

test('the garage button can wiggle now and then to be noticed, and is still otherwise', () => {
  const draw = (time, wiggle) => {
    const { ctx, points } = pointTracker();
    drawGarageButton(ctx, 100, 100, 80, { kind: 'car', time, wiggle });
    return points;
  };
  assert.deepEqual(draw(0.2, false), draw(1.7, false));
  assert.notDeepEqual(draw(0.2, true), draw(0.2, false));
  assert.deepEqual(draw(1.7, true), draw(1.7, false));
});

test('on a garage with room, no tile reaches into the top band of the sound and music buttons', () => {
  for (const [width, height] of ROOMY) {
    for (const page of everything(width, height).tiles) {
      for (const tile of page) assert.ok(tile.y >= SWITCH_BAND, `${width}x${height}: ${tile.y}`);
    }
  }
});
