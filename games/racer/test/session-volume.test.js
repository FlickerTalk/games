import { test } from 'vitest';
import assert from 'node:assert/strict';
import { setUp, memoryStore } from './session-harness.js';
import { soundRecorder } from './sound-recorder.js';
import { createSwitches } from '../src/sound-switches.js';
import { SOUND_KEY } from '../src/sound-settings.js';
import { volumeGain } from '../src/sound-volume.js';

async function withSwitches(extra = {}) {
  const sound = soundRecorder();
  const switches = createSwitches(document);
  const run = await setUp({ sound, switches, ...extra });
  run.play(0.05);
  return { ...run, switches, heard: sound.heard };
}

const slideTo = (switches, percent) => {
  switches.range.value = String(percent);
  switches.range.dispatchEvent(new Event('input'));
};
const letGo = (switches) => switches.range.dispatchEvent(new Event('change'));
const kept = (store) => store.writes.filter(([name]) => name === SOUND_KEY).at(-1);

test('tapping the speaker brings out the volume line, and tapping it again puts it away', async () => {
  const { switches, heard } = await withSwitches();
  assert.equal(switches.volume.hidden, true);
  switches.sound.click();
  assert.equal(switches.volume.hidden, false);
  assert.equal(switches.sound.getAttribute('aria-expanded'), 'true');
  assert.ok(heard.unlocks >= 1);
  switches.sound.click();
  assert.equal(switches.volume.hidden, true);
});

test('moving the line sets the whole volume at once, and letting go keeps it and plays a short sample', async () => {
  const { switches, store, heard } = await withSwitches();
  switches.sound.click();
  slideTo(switches, 30);
  assert.equal(heard.volume.at(-1), volumeGain(0.3));
  assert.equal(switches.sound.dataset.level, 'low');
  assert.deepEqual(heard.cues, []);
  letGo(switches);
  await Promise.resolve();
  assert.deepEqual(kept(store), [SOUND_KEY, '{"volume":0.3,"music":true}']);
  assert.deepEqual(heard.cues, ['pick']);
});

test('down to zero silences everything and crosses the speaker out, and up again brings it back', async () => {
  const { switches, heard } = await withSwitches();
  switches.sound.click();
  slideTo(switches, 0);
  letGo(switches);
  assert.equal(heard.volume.at(-1), 0);
  assert.equal(switches.sound.dataset.level, 'off');
  assert.deepEqual(heard.cues, []);
  slideTo(switches, 80);
  assert.equal(heard.volume.at(-1), volumeGain(0.8));
  assert.equal(switches.sound.dataset.level, 'high');
});

test('the line folds away by itself a few seconds after the last touch, but never while it is held', async () => {
  const { switches, play } = await withSwitches();
  switches.sound.click();
  play(2);
  assert.equal(switches.volume.hidden, false);
  play(1.5);
  assert.equal(switches.volume.hidden, true);
  switches.sound.click();
  switches.volume.dispatchEvent(new Event('pointerdown'));
  play(6);
  assert.equal(switches.volume.hidden, false);
  switches.volume.dispatchEvent(new Event('pointerup'));
  play(2);
  assert.equal(switches.volume.hidden, false);
  play(1.5);
  assert.equal(switches.volume.hidden, true);
});

test('a touch outside folds the line away, and the race goes on all along', async () => {
  const { session, switches, goButton, page, play } = await withSwitches();
  goButton.click();
  play(1.7);
  switches.sound.click();
  play(0.5);
  assert.equal(session.game.state, 'racing');
  page.dispatchEvent(new Event('pointerdown'));
  assert.equal(switches.volume.hidden, true);
  assert.equal(session.game.state, 'racing');
});

test('keys pressed on the line move it, and do not reach the game', async () => {
  const { switches } = await withSwitches();
  switches.sound.click();
  document.body.append(switches.volume);
  let reached = 0;
  const hear = () => {
    reached += 1;
  };
  window.addEventListener('keydown', hear);
  switches.range.dispatchEvent(Object.assign(new Event('keydown', { bubbles: true }), { key: 'ArrowUp' }));
  window.removeEventListener('keydown', hear);
  assert.equal(reached, 0);
  switches.range.dispatchEvent(Object.assign(new Event('keydown', { bubbles: true }), { key: 'Escape' }));
  assert.equal(switches.volume.hidden, true);
  switches.volume.remove();
});

test('the note button turns the music on and off, and the store keeps it', async () => {
  const { switches, store, heard } = await withSwitches();
  assert.equal(switches.music.getAttribute('aria-pressed'), 'true');
  switches.music.click();
  assert.equal(heard.music.at(-1), false);
  assert.equal(switches.music.getAttribute('aria-pressed'), 'false');
  await Promise.resolve();
  assert.deepEqual(kept(store), [SOUND_KEY, '{"volume":1,"music":false}']);
});

test('the volume and the music kept from last time are back when the game opens', async () => {
  const store = memoryStore({ [SOUND_KEY]: '{"volume":0.3,"music":false}' });
  const { switches, heard } = await withSwitches({ store });
  assert.equal(heard.volume.at(-1), volumeGain(0.3));
  assert.equal(heard.music.at(-1), false);
  assert.equal(switches.sound.dataset.level, 'low');
  assert.equal(switches.range.value, '30');
});

test('the buttons and the line are named in the page language', async () => {
  const { switches, page, play } = await withSwitches();
  page.documentElement.lang = 'es';
  play(0.05);
  assert.equal(switches.sound.getAttribute('aria-label'), 'Sonido');
  assert.equal(switches.range.getAttribute('aria-label'), 'Volumen');
});
