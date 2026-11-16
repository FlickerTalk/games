import { test } from 'vitest';
import assert from 'node:assert/strict';
import { CUE_NAMES, cueSound } from '../src/sound-cues.js';
import { assertVoice, loudestMoment, lastsFor } from './voice-checks.js';

const pitches = (name) => cueSound(name).voices.filter((voice) => voice.frequency !== undefined);
const firstPitch = (name) => [...pitches(name)].sort((a, b) => a.start - b.start)[0].frequency;
const lastPitch = (name) => [...pitches(name)].sort((a, b) => b.start - a.start || b.frequency - a.frequency)[0].frequency;

test('the race has a sound for each moment a child should hear', () => {
  assert.deepEqual([...CUE_NAMES].sort(), ['bump', 'finish', 'gift', 'go', 'lose', 'nudge', 'pick', 'splash', 'tap', 'tick', 'whoosh', 'win'].sort());
});

test('every sound is soft: gentle waves, no instant attack, a moderate level and a range that never shrieks', () => {
  for (const name of CUE_NAMES) {
    const { voices } = cueSound(name);
    assert.ok(voices.length > 0, name);
    voices.forEach((voice, index) => assertVoice(voice, `${name}[${index}]`));
    assert.ok(loudestMoment(voices) <= 0.5, `${name}: ${loudestMoment(voices)}`);
  }
});

test('every sound is short, and the win tune lasts between one and two seconds', () => {
  for (const name of CUE_NAMES) assert.ok(lastsFor(cueSound(name).voices) <= 2, name);
  const win = lastsFor(cueSound('win').voices);
  assert.ok(win >= 1 && win <= 2, `${win}`);
  for (const name of ['tap', 'pick', 'tick', 'bump']) assert.ok(lastsFor(cueSound(name).voices) <= 0.35, name);
});

test('the go beep is higher than the countdown ticks', () => {
  assert.ok(firstPitch('go') > firstPitch('tick'));
});

test('the win tune and the gift climb, and losing never goes down', () => {
  assert.ok(lastPitch('win') > firstPitch('win'));
  assert.ok(lastPitch('gift') > firstPitch('gift'));
  const lose = [...pitches('lose')].sort((a, b) => a.start - b.start);
  for (let index = 1; index < lose.length; index += 1) assert.ok(lose[index].frequency >= lose[index - 1].frequency);
  assert.ok(lose.every((voice) => voice.toFrequency === undefined || voice.toFrequency >= voice.frequency));
});

test('the tunes ask the music to step back while they play, and the small sounds do not', () => {
  for (const name of ['win', 'lose', 'gift', 'finish']) assert.ok(cueSound(name).duck >= lastsFor(cueSound(name).voices) * 0.8, name);
  for (const name of ['tap', 'pick', 'tick', 'bump', 'splash', 'whoosh', 'nudge']) assert.equal(cueSound(name).duck, 0, name);
});

test('the splash and the whoosh are made of noise, and the bump has a body', () => {
  assert.ok(cueSound('splash').voices.some((voice) => voice.wave === 'noise'));
  assert.ok(cueSound('whoosh').voices.every((voice) => voice.wave === 'noise'));
  assert.ok(cueSound('bump').voices.some((voice) => voice.frequency < 200));
});

test('an unknown sound is nothing', () => {
  assert.equal(cueSound('crash-bang'), null);
});
