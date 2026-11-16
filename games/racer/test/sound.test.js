import { test, beforeEach } from 'vitest';
import assert from 'node:assert/strict';
import { createSound } from '../src/sound.js';
import { engineTone } from '../src/sound-engine-tone.js';
import { cueSound } from '../src/sound-cues.js';
import { MUSIC_LEVEL, MASTER_LEVEL } from '../src/sound-levels.js';
import { FakeAudioContext, sourcesOf } from './fake-audio.js';

beforeEach(() => {
  FakeAudioContext.made = [];
});

const make = () => createSound({ AudioContextClass: FakeAudioContext });
const context = () => FakeAudioContext.made[0];

function running() {
  const sound = make();
  sound.unlock();
  return { sound, context: context() };
}

test('without Web Audio every call is a silent no-op', () => {
  const sound = createSound({ AudioContextClass: null });
  sound.unlock();
  sound.cue('win');
  sound.engine(engineTone({ share: 1, pressing: true }));
  sound.song('race');
  sound.setAwake(false);
  sound.setVolume(0);
  sound.setMusicOn(false);
  sound.tick();
  sound.close();
  assert.equal(sound.unlocked, false);
  assert.equal(sound.muted, true);
  assert.equal(sound.musicOn, false);
});

test('nothing is made before the first touch, which makes one context and starts it', () => {
  const sound = make();
  sound.cue('tap');
  sound.song('calm');
  sound.tick();
  assert.equal(FakeAudioContext.made.length, 0);
  sound.unlock();
  sound.unlock();
  assert.equal(FakeAudioContext.made.length, 1);
  assert.equal(context().state, 'running');
  assert.equal(sound.unlocked, true);
});

test('a cue plays at once into the effects, and a tune also steps the music back', () => {
  const { sound, context: audio } = running();
  const before = sourcesOf(audio).length;
  sound.cue('tick');
  assert.equal(sourcesOf(audio).length - before, cueSound('tick').voices.length);
  sound.cue('nothing-like-this');
  assert.equal(sourcesOf(audio).length - before, cueSound('tick').voices.length);
  const musicBus = audio.nodes.find((node) => node.kind === 'gain' && node.gain.value === MUSIC_LEVEL);
  const ducks = musicBus.gain.events.length;
  sound.cue('win');
  assert.ok(musicBus.gain.events.length > ducks);
});

test('at zero volume or asleep, the context is suspended and no cue is booked; coming back resumes it', () => {
  const { sound, context: audio } = running();
  sound.setVolume(0);
  assert.equal(audio.state, 'suspended');
  const before = sourcesOf(audio).length;
  sound.cue('bump');
  assert.equal(sourcesOf(audio).length, before);
  sound.setVolume(0.3);
  assert.equal(audio.state, 'running');
  sound.setAwake(false);
  assert.equal(audio.state, 'suspended');
  sound.cue('bump');
  assert.equal(sourcesOf(audio).length, before);
  sound.setAwake(true);
  assert.equal(audio.state, 'running');
});

test('a sound turned down to zero before the first touch stays silent after it', () => {
  const sound = make();
  sound.setVolume(0);
  sound.unlock();
  assert.notEqual(context().state, 'running');
});

test('a volume above zero scales the whole mix at the master, and the last one asked for is used from the first touch', () => {
  const sound = make();
  sound.setVolume(0.25);
  sound.unlock();
  const [limiter] = context().nodes.filter((node) => node.kind === 'compressor');
  const master = context().nodes.find((node) => node.kind === 'gain' && node.outputs.includes(limiter));
  assert.ok(Math.abs(master.gain.events.at(-1).value - MASTER_LEVEL * 0.25) < 1e-12);
  sound.setVolume(1);
  assert.ok(Math.abs(master.gain.events.at(-1).value - MASTER_LEVEL) < 1e-12);
  assert.equal(sound.muted, false);
});

test('telling it the same thing every frame does not knock on the context again', () => {
  const { sound, context: audio } = running();
  const calls = audio.calls.length;
  for (let frame = 0; frame < 10; frame += 1) sound.setAwake(true);
  assert.equal(audio.calls.length, calls);
});

test('the music plays the asked song only while the music switch is on', () => {
  const { sound } = running();
  sound.song('calm');
  assert.equal(sound.playing, 'calm');
  sound.setMusicOn(false);
  assert.equal(sound.playing, null);
  sound.song('race');
  assert.equal(sound.playing, null);
  sound.setMusicOn(true);
  assert.equal(sound.playing, 'race');
});

test('a song asked for before the first touch starts with it', () => {
  const sound = make();
  sound.song('calm');
  sound.unlock();
  assert.equal(sound.playing, 'calm');
});

test('ticking books the music only while it can be heard', () => {
  const { sound, context: audio } = running();
  sound.song('calm');
  sound.tick();
  const booked = sourcesOf(audio).length;
  assert.ok(booked > 0);
  sound.setAwake(false);
  audio.currentTime = 5;
  sound.tick();
  assert.equal(sourcesOf(audio).length, booked);
});

test('closing lets the context go', () => {
  const { sound, context: audio } = running();
  sound.close();
  assert.equal(audio.state, 'closed');
  assert.equal(sound.unlocked, false);
});

test('a context the page refuses to make leaves the game silent, and nothing throws', () => {
  class Refused {
    constructor() {
      throw new DOMException('not allowed', 'NotAllowedError');
    }
  }
  const sound = createSound({ AudioContextClass: Refused });
  sound.unlock();
  sound.unlock();
  sound.cue('tap');
  sound.engine(engineTone({ share: 1, pressing: true }));
  sound.song('race');
  sound.setAwake(false);
  sound.setAwake(true);
  sound.tick();
  sound.close();
  assert.equal(sound.unlocked, false);
});

test('a refused resume or suspend is caught, never left as an unhandled rejection', async () => {
  const refused = [];
  class Grumpy extends FakeAudioContext {
    resume() {
      refused.push('resume');
      return Promise.reject(new DOMException('not allowed', 'NotAllowedError'));
    }

    suspend() {
      refused.push('suspend');
      return Promise.reject(new DOMException('not allowed', 'InvalidStateError'));
    }

    close() {
      refused.push('close');
      return Promise.reject(new DOMException('not allowed', 'InvalidStateError'));
    }
  }
  const sound = createSound({ AudioContextClass: Grumpy });
  sound.unlock();
  FakeAudioContext.made[0].state = 'running';
  sound.setAwake(false);
  sound.close();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(refused, ['resume', 'suspend', 'close']);
});
