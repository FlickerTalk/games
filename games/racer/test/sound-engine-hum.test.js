import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createEngineHum } from '../src/sound-engine-hum.js';
import { engineTone } from '../src/sound-engine-tone.js';
import { FakeAudioContext, nodesOf, reaches } from './fake-audio.js';

function setUp() {
  const context = new FakeAudioContext();
  const bus = context.createGain();
  const hum = createEngineHum(context, bus);
  const level = nodesOf(context, 'gain').find((node) => node.outputs.includes(bus));
  return { context, bus, hum, level };
}

const lastTarget = (param) => param.events.filter((event) => event.type === 'target').at(-1)?.value;

test('the hum starts silent, with its oscillators already running into the engine bus', () => {
  const { context, bus, level } = setUp();
  assert.equal(level.gain.value, 0);
  const oscillators = nodesOf(context, 'oscillator');
  assert.ok(oscillators.length >= 2);
  for (const oscillator of oscillators) assert.equal(oscillator.started, 0);
  assert.ok(oscillators.some((oscillator) => reaches(oscillator, bus)));
});

test('a tone glides the pitch, the brightness, the purr and the level to their new values', () => {
  const { context, hum, level } = setUp();
  const tone = engineTone({ share: 0.6, pressing: true });
  hum.set(tone, 1);
  const pitched = nodesOf(context, 'oscillator').map((oscillator) => lastTarget(oscillator.frequency));
  assert.ok(pitched.includes(tone.frequency));
  assert.ok(pitched.includes(tone.purr));
  assert.equal(lastTarget(nodesOf(context, 'filter')[0].frequency), tone.cutoff);
  assert.equal(lastTarget(level.gain), tone.gain);
});

test('no tone fades the hum to silence', () => {
  const { hum, level } = setUp();
  hum.set(engineTone({ share: 1, pressing: true }), 1);
  hum.set(null, 2);
  assert.equal(lastTarget(level.gain), 0);
});

test('a tone that has hardly moved, or comes too soon, is not sent again', () => {
  const { hum, level } = setUp();
  hum.set(engineTone({ share: 0.5, pressing: false }), 1);
  const sent = level.gain.events.length;
  hum.set(engineTone({ share: 0.9, pressing: false }), 1.01);
  hum.set(engineTone({ share: 0.5, pressing: false }), 2);
  assert.equal(level.gain.events.length, sent);
  hum.set(engineTone({ share: 0.9, pressing: false }), 2.2);
  assert.ok(level.gain.events.length > sent);
});

test('stopping ends every oscillator and lets the hum go', () => {
  const { context, hum, level } = setUp();
  hum.stop(5);
  for (const oscillator of nodesOf(context, 'oscillator')) assert.equal(oscillator.stopped, 5);
  assert.equal(level.disconnected, true);
});
