import { test } from 'vitest';
import assert from 'node:assert/strict';
import { SOUND_KEY, MUSIC_ON_BY_DEFAULT, loadSoundSettings, saveSoundSettings } from '../src/sound-settings.js';
import { DEFAULT_VOLUME } from '../src/sound-volume.js';
import { memoryStore } from './session-harness.js';

const defaults = { volume: DEFAULT_VOLUME, music: MUSIC_ON_BY_DEFAULT };

test('in this trial the music plays by default, and one constant turns that off', () => {
  assert.equal(MUSIC_ON_BY_DEFAULT, true);
});

test('with nothing kept, the volume is full and the music follows the default', async () => {
  assert.deepEqual(await loadSoundSettings(memoryStore()), defaults);
  assert.deepEqual(await loadSoundSettings(undefined), defaults);
});

test('the volume and the music switch kept in the store come back', async () => {
  const store = memoryStore({ [SOUND_KEY]: '{"volume":0.4,"music":false}' });
  assert.deepEqual(await loadSoundSettings(store), { volume: 0.4, music: false });
});

test('a broken, strange, failing or silent store falls back to the defaults, one setting at a time', async () => {
  assert.deepEqual(await loadSoundSettings(memoryStore({ [SOUND_KEY]: 'not json' })), defaults);
  assert.deepEqual(await loadSoundSettings(memoryStore({ [SOUND_KEY]: '{"volume":7,"music":false}' })), { ...defaults, music: false });
  assert.deepEqual(await loadSoundSettings(memoryStore({ [SOUND_KEY]: '{"volume":0.2,"music":"yes"}' })), { ...defaults, volume: 0.2 });
  assert.deepEqual(await loadSoundSettings({ get: async () => { throw new Error('gone'); } }), defaults);
  assert.deepEqual(await loadSoundSettings({ get: () => new Promise(() => {}) }, { waitMs: 5 }), defaults);
});

test('settings kept by earlier versions of this trial are ignored without breaking anything', async () => {
  const older = '{"muted":true,"music":false,"effectsLevel":20,"musicLevel":0}';
  assert.deepEqual(await loadSoundSettings(memoryStore({ [SOUND_KEY]: older })), { ...defaults, music: false });
});

test('saving keeps the volume and the music switch as one small value', async () => {
  const store = memoryStore();
  assert.equal(await saveSoundSettings(store, { volume: 0.4, music: false, other: 1 }), true);
  assert.deepEqual(store.writes, [[SOUND_KEY, '{"volume":0.4,"music":false}']]);
  assert.equal(await saveSoundSettings(undefined, defaults), false);
  assert.equal(await saveSoundSettings({ set: async () => { throw new Error('full'); } }, defaults), false);
});
