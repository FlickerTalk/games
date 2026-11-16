import { test } from 'vitest';
import assert from 'node:assert/strict';
import { playVoice } from '../src/sound-voice-player.js';
import { pluck, hold, noise } from '../src/sound-voices.js';
import { FakeAudioContext, nodesOf, reaches } from './fake-audio.js';

function setUp() {
  const context = new FakeAudioContext();
  const out = context.createGain();
  const buffer = context.createBuffer(1, 8000, 8000);
  return { context, out, buffer };
}

const levelOf = (context) => nodesOf(context, 'gain').at(-1);

test('a tone is an oscillator of its wave and pitch, started and stopped on time', () => {
  const { context, out, buffer } = setUp();
  const source = playVoice(context, out, pluck('triangle', 330, 0.1, 0.2, 0.15), 2, buffer);
  assert.equal(source.kind, 'oscillator');
  assert.equal(source.type, 'triangle');
  assert.deepEqual(source.frequency.events[0], { type: 'set', value: 330, time: 2.1 });
  assert.equal(source.started, 2.1);
  assert.ok(source.stopped >= 2.3 && source.stopped < 2.4);
});

test('a glide moves the pitch to its end note over the whole voice', () => {
  const { context, out, buffer } = setUp();
  const source = playVoice(context, out, pluck('sine', 170, 0, 0.2, 0.3, { toFrequency: 75 }), 1, buffer);
  assert.deepEqual(source.frequency.events.at(-1), { type: 'exponential', value: 75, time: 1.2 });
});

test('a pluck rises from silence to its level over the attack and dies away to silence at the end', () => {
  const { context, out, buffer } = setUp();
  playVoice(context, out, pluck('sine', 440, 0, 0.5, 0.2), 1, buffer);
  const events = levelOf(context).gain.events;
  assert.deepEqual(events[0], { type: 'set', value: 0, time: 1 });
  assert.deepEqual(events[1], { type: 'linear', value: 0.2, time: 1.004 });
  assert.equal(events[2].type, 'exponential');
  assert.equal(events[2].time, 1.5);
  assert.deepEqual(events.at(-1), { type: 'set', value: 0, time: 1.5 });
});

test('a held note keeps its level until its release, then lets go to silence', () => {
  const { context, out, buffer } = setUp();
  playVoice(context, out, hold('sine', 440, 0, 1, 0.2), 0, buffer);
  const events = levelOf(context).gain.events;
  assert.deepEqual(events.slice(1), [
    { type: 'linear', value: 0.2, time: 0.02 },
    { type: 'set', value: 0.2, time: 0.88 },
    { type: 'linear', value: 0, time: 1 },
  ]);
});

test('noise plays the shared noise on a loop, coloured by its filter, which can sweep', () => {
  const { context, out, buffer } = setUp();
  const voice = noise(0, 0.4, 0.2, { type: 'bandpass', frequency: 1600, toFrequency: 450, q: 0.8 });
  const source = playVoice(context, out, voice, 3, buffer);
  assert.equal(source.kind, 'buffer');
  assert.equal(source.buffer, buffer);
  assert.equal(source.loop, true);
  const [filter] = nodesOf(context, 'filter');
  assert.equal(filter.type, 'bandpass');
  assert.equal(filter.Q.value, 0.8);
  assert.deepEqual(filter.frequency.events, [{ type: 'set', value: 1600, time: 3 }, { type: 'exponential', value: 450, time: 3.4 }]);
  assert.ok(source.outputs.includes(filter));
});

test('every voice ends at the given output, and its level node is let go once it has played', () => {
  const { context, out, buffer } = setUp();
  const source = playVoice(context, out, pluck('sine', 440, 0, 0.1, 0.2), 0, buffer);
  assert.ok(reaches(source, out));
  const level = levelOf(context);
  source.onended();
  assert.equal(level.disconnected, true);
});
