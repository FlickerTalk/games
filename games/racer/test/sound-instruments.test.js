import { test } from 'vitest';
import assert from 'node:assert/strict';
import { INSTRUMENTS, instrumentVoices } from '../src/sound-instruments.js';
import { noteFrequency } from '../src/sound-pitch.js';
import { assertVoice } from './voice-checks.js';

const note = (instrument, sound, extra = {}) => ({
  instrument, sound, duration: 0.25, volume: 1, ...(sound.length > 1 ? { frequency: noteFrequency(sound) } : {}), ...extra,
});

test('the songs play on five soft instruments', () => {
  assert.deepEqual([...INSTRUMENTS].sort(), ['bass', 'bell', 'drums', 'flute', 'harp']);
});

test('each instrument gives well-formed voices that stay near their note', () => {
  const samples = [note('flute', 'A5'), note('harp', 'C4'), note('bell', 'C6'), note('bass', 'G2'), note('drums', 'k'), note('drums', 'h'), note('drums', 's')];
  for (const sample of samples) {
    const voices = instrumentVoices(sample);
    assert.ok(voices.length > 0, sample.sound);
    voices.forEach((voice, index) => assertVoice(voice, `${sample.instrument} ${sample.sound}[${index}]`, { highest: 4200 }));
    assert.ok(voices.every((voice) => voice.start === 0 && voice.duration <= sample.duration + 1));
  }
});

test('a pitched note sounds at its own pitch', () => {
  for (const instrument of ['flute', 'harp', 'bell', 'bass']) {
    const voices = instrumentVoices(note(instrument, 'E4'));
    assert.ok(voices.some((voice) => Math.abs(voice.frequency - noteFrequency('E4')) < 1e-9), instrument);
  }
});

test('the drums are light hits made mostly of noise', () => {
  for (const hit of ['h', 's']) assert.ok(instrumentVoices(note('drums', hit)).some((voice) => voice.wave === 'noise'), hit);
  assert.ok(instrumentVoices(note('drums', 'k')).some((voice) => voice.wave === 'noise'));
  for (const hit of ['k', 'h', 's']) assert.ok(instrumentVoices(note('drums', hit)).every((voice) => voice.duration <= 0.2), hit);
});

test('the track volume scales every voice', () => {
  const full = instrumentVoices(note('bell', 'G5'));
  const half = instrumentVoices(note('bell', 'G5', { volume: 0.5 }));
  full.forEach((voice, index) => assert.ok(Math.abs(half[index].gain - voice.gain / 2) < 1e-9));
});

test('an unknown instrument or drum is refused', () => {
  assert.throws(() => instrumentVoices(note('kazoo', 'C4')));
  assert.throws(() => instrumentVoices({ instrument: 'drums', sound: 'x', duration: 0.25, volume: 1 }));
});
