import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createMixer } from '../src/sound-mixer.js';
import { MASTER_LEVEL, MUSIC_LEVEL, DUCKED_SHARE, LIMITER } from '../src/sound-levels.js';
import { FakeAudioContext, nodesOf, reaches } from './fake-audio.js';

test('effects, engine and music all reach the speakers through one master level and a limiter', () => {
  const context = new FakeAudioContext();
  const mixer = createMixer(context);
  const [limiter] = nodesOf(context, 'compressor');
  for (const bus of [mixer.effects, mixer.engine, mixer.music]) {
    assert.ok(reaches(bus, limiter));
    assert.ok(reaches(bus, context.destination));
  }
  assert.deepEqual(limiter.outputs, [context.destination]);
  for (const [name, value] of Object.entries(LIMITER)) assert.equal(limiter[name].value, value, name);
  const master = nodesOf(context, 'gain').find((node) => node.outputs.includes(limiter));
  assert.equal(master.gain.value, MASTER_LEVEL);
});

test('the music bus starts at the music level, the others at full', () => {
  const mixer = createMixer(new FakeAudioContext());
  assert.equal(mixer.music.gain.value, MUSIC_LEVEL);
  assert.equal(mixer.effects.gain.value, 1);
  assert.equal(mixer.engine.gain.value, 1);
});

test('ducking takes the music down to a share and brings it back once the tune is over', () => {
  const mixer = createMixer(new FakeAudioContext());
  mixer.duckMusic(10, 1.5);
  const events = mixer.music.gain.events;
  assert.deepEqual(events[0], { type: 'cancel', time: 10 });
  assert.equal(events[1].type, 'target');
  assert.ok(Math.abs(events[1].value - MUSIC_LEVEL * DUCKED_SHARE) < 1e-12);
  assert.equal(events[1].time, 10);
  assert.equal(events[2].value, MUSIC_LEVEL);
  assert.equal(events[2].time, 11.5);
});

test('there is one second of white noise for everyone to share', () => {
  const context = new FakeAudioContext();
  const { noise } = createMixer(context);
  assert.equal(noise.length, context.sampleRate);
  const samples = noise.getChannelData(0);
  assert.ok(samples.every((sample) => sample >= -1 && sample <= 1));
  assert.ok(new Set(samples.slice(0, 100)).size > 50);
});

test('the volume moves the master level smoothly between silence and the balanced level', () => {
  const context = new FakeAudioContext();
  const mixer = createMixer(context);
  const [limiter] = nodesOf(context, 'compressor');
  const master = nodesOf(context, 'gain').find((node) => node.outputs.includes(limiter));
  mixer.setVolume(3, 0.25);
  const last = master.gain.events.at(-1);
  assert.equal(last.type, 'target');
  assert.equal(last.time, 3);
  assert.ok(Math.abs(last.value - MASTER_LEVEL * 0.25) < 1e-12);
});
