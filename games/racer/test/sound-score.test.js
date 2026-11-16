import { test } from 'vitest';
import assert from 'node:assert/strict';
import { parseTrack, compileScore, eventsBetween } from '../src/sound-score.js';
import { noteFrequency } from '../src/sound-pitch.js';

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} vs ${expected}`);

const tiny = {
  tempo: 120,
  stepsPerBeat: 2,
  beatsPerBar: 4,
  bars: 2,
  tracks: [
    { instrument: 'flute', notes: 'C5:2 E5:2 G5:4 r:6 C6:2' },
    { instrument: 'drums', notes: 'k h s h', volume: 0.5 },
  ],
};

test('a track reads notes, drum hits and rests with their length in steps', () => {
  assert.deepEqual(parseTrack('C5:2 r:3 F#4 k h:2'), [
    { sound: 'C5', steps: 2 },
    { sound: null, steps: 3 },
    { sound: 'F#4', steps: 1 },
    { sound: 'k', steps: 1 },
    { sound: 'h', steps: 2 },
  ]);
});

test('a token that is neither a note, a drum nor a rest is refused', () => {
  for (const bad of ['X5', 'C5:0', 'C5:-1', 'C5:x', 'kick']) assert.throws(() => parseTrack(bad), bad);
});

test('notes land on the beat grid of the tempo, with their pitch and length', () => {
  const song = compileScore(tiny);
  assert.equal(song.stepSeconds, 0.25);
  assert.equal(song.loopSeconds, 4);
  const flute = song.events.filter((event) => event.instrument === 'flute');
  assert.deepEqual(flute.map((event) => [event.time, event.duration]), [[0, 0.5], [0.5, 0.5], [1, 1], [3.5, 0.5]]);
  near(flute[2].frequency, noteFrequency('G5'));
  assert.equal(flute[0].volume, 1);
});

test('a short pattern repeats until the song is full, and the events come in time order', () => {
  const song = compileScore(tiny);
  const drums = song.events.filter((event) => event.instrument === 'drums');
  assert.equal(drums.length, 16);
  assert.deepEqual(drums.slice(0, 5).map((event) => event.sound), ['k', 'h', 's', 'h', 'k']);
  assert.equal(drums[0].volume, 0.5);
  assert.equal(drums[0].frequency, undefined);
  const times = song.events.map((event) => event.time);
  assert.deepEqual(times, [...times].sort((a, b) => a - b));
});

test('a pattern that does not fit the song a whole number of times is refused', () => {
  assert.throws(() => compileScore({ ...tiny, tracks: [{ instrument: 'flute', notes: 'C5:3' }] }));
  assert.throws(() => compileScore({ ...tiny, tracks: [{ instrument: 'flute', notes: 'C5:32' }] }));
});

test('a window picks the events that start inside it, going round the loop', () => {
  const song = compileScore(tiny);
  const flute = (from, to) => eventsBetween(song, 10, from, to).filter((event) => event.instrument === 'flute');
  assert.deepEqual(flute(10, 11).map((event) => event.at), [10, 10.5]);
  assert.deepEqual(flute(13.4, 14.6).map((event) => event.at), [13.5, 14, 14.5]);
  assert.deepEqual(flute(5, 10).map((event) => event.at), []);
  assert.deepEqual(flute(12, 12), []);
});

test('back-to-back windows play every note once, with no gap and no repeat at the loop', () => {
  const song = compileScore(tiny);
  const heard = [];
  for (let from = 0; from < 12; from += 0.37) heard.push(...eventsBetween(song, 0, from, Math.min(12, from + 0.37)));
  assert.equal(heard.length, song.events.length * 3);
  const starts = heard.map((event) => `${event.instrument}@${event.at.toFixed(6)}`);
  assert.equal(new Set(starts).size, starts.length);
});
