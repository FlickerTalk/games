import { test } from 'vitest';
import assert from 'node:assert/strict';
import { STYLE, injectStyle } from '../src/style.js';

const squashed = STYLE.replace(/\s+/g, '');

test('the element fills what it is given and keeps touches for the game', () => {
  for (const rule of ['ft-racer{', 'display:block', 'width:100%', 'height:100%', 'touch-action:none', 'user-select:none', 'overflow:hidden']) {
    assert.ok(squashed.includes(rule), rule);
  }
});

test('the go button has no look of its own, because the canvas draws it', () => {
  const go = squashed.slice(squashed.indexOf('ft-racer.go{'));
  for (const rule of ['background:transparent', 'border:0', 'position:absolute']) assert.ok(go.includes(rule), rule);
});

test('the style goes into a document once', () => {
  const page = document.implementation.createHTMLDocument('');
  injectStyle(page);
  injectStyle(page);
  const added = page.head.querySelectorAll('style[data-ft-racer]');
  assert.equal(added.length, 1);
  assert.equal(added[0].textContent, STYLE);
});

test('the sound and music switches are round buttons of at least 44 px above the canvas', () => {
  const rule = squashed.slice(squashed.indexOf('ft-racer.sound-switch{'));
  for (const part of ['position:absolute', 'width:44px', 'height:44px', 'border-radius:50%', 'z-index:1']) assert.ok(rule.includes(part), part);
  assert.ok(squashed.includes('ft-racer.sound-switch[aria-pressed=false]{'));
});

test('the volume line is a pop-out over the game, turned upright, with a big handle', () => {
  for (const part of ['ft-racer.volume-pop{', 'ft-racer.volume-pop[hidden]{display:none}', 'transform:rotate(-90deg)', 'ft-racer.volume::-webkit-slider-thumb{', 'ft-racer.volume::-moz-range-thumb{']) {
    assert.ok(squashed.includes(part), part);
  }
  const thumb = squashed.slice(squashed.indexOf('ft-racer.volume::-webkit-slider-thumb{'));
  assert.ok(thumb.includes('width:40px') && thumb.includes('height:40px'));
});
