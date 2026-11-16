import { test } from 'vitest';
import assert from 'node:assert/strict';
import { noteFrequency } from '../src/sound-pitch.js';

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.01, `${actual} vs ${expected}`);

test('A4 is 440 Hz and each octave doubles it', () => {
  near(noteFrequency('A4'), 440);
  near(noteFrequency('A5'), 880);
  near(noteFrequency('A2'), 110);
});

test('notes follow equal temperament, with sharps and flats', () => {
  near(noteFrequency('C4'), 261.63);
  near(noteFrequency('E5'), 659.26);
  near(noteFrequency('F#5'), 739.99);
  near(noteFrequency('Bb2'), 116.54);
  near(noteFrequency('C#4'), noteFrequency('Db4'));
});

test('a name that is not a note is refused', () => {
  for (const bad of ['H4', 'A', 'c4', 'A#', '', 'k']) assert.throws(() => noteFrequency(bad), bad);
});
