import { test } from 'vitest';
import assert from 'node:assert/strict';
import { SONGS } from '../src/sound-songs.js';
import { compileScore, parseTrack } from '../src/sound-score.js';
import { noteFrequency } from '../src/sound-pitch.js';

const trackOf = (score, instrument) => score.tracks.find((track) => track.instrument === instrument);
const pitched = (track) => parseTrack(track.notes).filter((note) => note.sound).map((note) => note.sound);
const stepsOf = (track) => parseTrack(track.notes).reduce((sum, note) => sum + note.steps, 0);
const loopSteps = (score) => score.bars * score.beatsPerBar * score.stepsPerBeat;

test('there is a calm song for the cards and the garage and a lively one for the race', () => {
  assert.deepEqual(Object.keys(SONGS).sort(), ['calm', 'race']);
  assert.ok(SONGS.calm.tempo <= 100 && SONGS.calm.tempo >= 70);
  assert.ok(SONGS.race.tempo >= 115 && SONGS.race.tempo <= 140);
});

test('each song loops over 16 to 32 bars, long enough not to tire quickly', () => {
  for (const [name, score] of Object.entries(SONGS)) {
    assert.ok(score.bars >= 16 && score.bars <= 32, name);
    assert.ok(compileScore(score).loopSeconds >= 30, name);
  }
});

test('each song has a melody written from start to end, a bass and light drums', () => {
  const melodies = { calm: 'flute', race: 'bell' };
  for (const [name, score] of Object.entries(SONGS)) {
    const melody = trackOf(score, melodies[name]);
    assert.ok(melody, name);
    assert.equal(stepsOf(melody), loopSteps(score), name);
    assert.ok(trackOf(score, 'bass'), name);
    const drums = trackOf(score, 'drums');
    assert.ok(drums.volume <= 0.8, name);
    assert.ok(parseTrack(drums.notes).every((hit) => hit.sound === null || ['k', 'h', 's'].includes(hit.sound)), name);
  }
});

test('the melody sits where a toy sings and the bass stays low, so they never tread on each other', () => {
  for (const [name, score] of Object.entries(SONGS)) {
    for (const track of score.tracks.filter((one) => one.instrument !== 'drums')) {
      const [low, high] = track.instrument === 'bass' ? ['E2', 'C4'] : ['G3', 'C7'];
      for (const note of pitched(track)) {
        const frequency = noteFrequency(note);
        assert.ok(frequency >= noteFrequency(low) - 0.01 && frequency <= noteFrequency(high) + 0.01, `${name} ${track.instrument} ${note}`);
      }
    }
  }
});

test('each melody comes home to its key note at the end of the loop', () => {
  for (const [name, score] of Object.entries(SONGS)) {
    const melody = score.tracks[0];
    const last = pitched(melody).at(-1);
    assert.equal(last.replace(/\d$/, ''), score.key.split(' ')[0], name);
  }
});

test('a score is small data, a few kilobytes at most', () => {
  for (const [name, score] of Object.entries(SONGS)) {
    const bytes = new TextEncoder().encode(JSON.stringify(score)).length;
    assert.ok(bytes < 4096, `${name}: ${bytes} bytes`);
  }
  assert.notEqual(SONGS.calm.tracks[0].notes, SONGS.race.tracks[0].notes);
});
