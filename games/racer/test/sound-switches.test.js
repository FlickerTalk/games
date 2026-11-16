import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createSwitches, paintSwitches, labelSwitches, placeSwitches } from '../src/sound-switches.js';

test('there is a speaker button, a music button with no text, and one hidden volume line', () => {
  const { sound, music, volume, range } = createSwitches(document);
  for (const button of [sound, music]) {
    assert.equal(button.tagName, 'BUTTON');
    assert.equal(button.type, 'button');
    assert.ok(button.classList.contains('sound-switch'));
    assert.equal(button.textContent.trim(), '');
    assert.ok(button.querySelector('svg'));
  }
  assert.ok(sound.classList.contains('sound') && music.classList.contains('music'));
  assert.ok(volume.classList.contains('volume-pop'));
  assert.equal(volume.hidden, true);
  assert.equal(range.parentElement, volume);
  assert.deepEqual([range.type, range.min, range.max, range.step], ['range', '0', '100', '1']);
});

test('the speaker icon shows the volume level, and the line shows the volume', () => {
  const switches = createSwitches(document);
  const icons = {};
  for (const [volume, level] of [[1, 'high'], [0.3, 'low'], [0, 'off']]) {
    paintSwitches(switches, { volume, music: true }, { open: false });
    assert.equal(switches.sound.dataset.level, level);
    assert.equal(switches.range.value, String(Math.round(volume * 100)));
    icons[level] = switches.sound.innerHTML;
  }
  assert.equal(new Set(Object.values(icons)).size, 3);
});

test('the speaker says whether the line is out, and the music button whether the music is on', () => {
  const switches = createSwitches(document);
  paintSwitches(switches, { volume: 1, music: true }, { open: true });
  assert.equal(switches.volume.hidden, false);
  assert.equal(switches.sound.getAttribute('aria-expanded'), 'true');
  assert.equal(switches.music.getAttribute('aria-pressed'), 'true');
  paintSwitches(switches, { volume: 1, music: false }, { open: false });
  assert.equal(switches.volume.hidden, true);
  assert.equal(switches.sound.getAttribute('aria-expanded'), 'false');
  assert.equal(switches.music.getAttribute('aria-pressed'), 'false');
});

test('the buttons and the line carry the labels they are given', () => {
  const switches = createSwitches(document);
  labelSwitches(switches, { sound: 'Sonido', music: 'Música', volume: 'Volumen' });
  assert.equal(switches.sound.getAttribute('aria-label'), 'Sonido');
  assert.equal(switches.music.getAttribute('aria-label'), 'Música');
  assert.equal(switches.range.getAttribute('aria-label'), 'Volumen');
});

test('the buttons and the line are placed where the layout says, in pixels', () => {
  const switches = createSwitches(document);
  placeSwitches(switches, {
    sound: { x: 8, y: 8, size: 44 }, music: { x: 308, y: 8, size: 44 }, volume: { x: 8, y: 58, width: 44, length: 200 },
  });
  assert.equal(switches.sound.style.left, '8px');
  assert.equal(switches.music.style.left, '308px');
  assert.equal(switches.volume.style.top, '58px');
  assert.equal(switches.volume.style.height, '200px');
  assert.equal(switches.volume.style.width, '44px');
  assert.equal(switches.range.style.width, '200px');
});
