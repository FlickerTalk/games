import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createMusicPlayer, FADE_SECONDS, LOOKAHEAD_SECONDS } from '../src/sound-music-player.js';
import { createMixer } from '../src/sound-mixer.js';
import { compileScore } from '../src/sound-score.js';
import { instrumentVoices } from '../src/sound-instruments.js';
import { FakeAudioContext, sourcesOf, reaches } from './fake-audio.js';

const SONGS = {
  one: { key: 'C major', tempo: 120, stepsPerBeat: 2, beatsPerBar: 4, bars: 1, tracks: [{ instrument: 'harp', notes: 'C4:2 E4:2 G4:2 C5:2' }] },
  two: { key: 'G major', tempo: 120, stepsPerBeat: 2, beatsPerBar: 4, bars: 1, tracks: [{ instrument: 'drums', notes: 'k h s h' }] },
};

const voicesPerLoop = (name) => compileScore(SONGS[name]).events.reduce((sum, event) => sum + instrumentVoices(event).length, 0);

function setUp() {
  const context = new FakeAudioContext();
  const mixer = createMixer(context);
  const before = sourcesOf(context).length;
  const player = createMusicPlayer(context, mixer, SONGS);
  const played = () => sourcesOf(context).slice(before);
  return { context, mixer, player, played };
}

test('nothing plays until a song is asked for', () => {
  const { player, played } = setUp();
  player.schedule(0);
  player.schedule(1);
  assert.equal(played().length, 0);
  assert.equal(player.playing, null);
});

test('a song only books the notes that start within the lookahead, into the music bus', () => {
  const { mixer, player, played } = setUp();
  player.play('one', 0);
  player.schedule(0);
  const starts = played().map((source) => source.started);
  assert.ok(starts.length > 0);
  assert.ok(starts.every((time) => time < LOOKAHEAD_SECONDS));
  assert.ok(played().every((source) => reaches(source, mixer.music)));
});

test('scheduling frame after frame plays every note once, round the loop, without a gap', () => {
  const { player, played } = setUp();
  player.play('one', 0);
  for (let now = 0; now <= 6.2; now += 1 / 60) player.schedule(now);
  const loop = compileScore(SONGS.one).loopSeconds;
  const loops = Math.floor((6.2 + LOOKAHEAD_SECONDS) / loop);
  const starts = played().map((source) => source.started);
  assert.ok(starts.length >= voicesPerLoop('one') * loops);
  const notes = [...new Set(starts.map((time) => time.toFixed(6)))].map(Number).sort((a, b) => a - b);
  const gaps = notes.slice(1).map((time, index) => time - notes[index]);
  assert.ok(gaps.every((gap) => Math.abs(gap - 0.5) < 1e-6), JSON.stringify(gaps));
  assert.equal(new Set(starts.map((time) => time.toFixed(6))).size, starts.length);
});

test('asking for the song already playing does not restart it', () => {
  const { player, played } = setUp();
  player.play('one', 0);
  player.schedule(0);
  player.play('one', 0.1);
  player.schedule(0.1);
  assert.deepEqual(played().map((source) => Number(source.started.toFixed(6))), [0.05, 0.55]);
});

test('a new song fades in while the old one fades out and is then let go', () => {
  const { context, mixer, player } = setUp();
  player.play('one', 0);
  const oldGain = context.nodes.filter((node) => node.kind === 'gain' && node.outputs.includes(mixer.music)).at(-1);
  player.schedule(0);
  player.play('two', 2);
  const newGain = context.nodes.filter((node) => node.kind === 'gain' && node.outputs.includes(mixer.music)).at(-1);
  assert.notEqual(newGain, oldGain);
  assert.equal(player.playing, 'two');
  assert.equal(oldGain.gain.events.at(-1).type, 'target');
  assert.equal(oldGain.gain.events.at(-1).value, 0);
  assert.deepEqual(newGain.gain.events, [{ type: 'set', value: 0, time: 2 }, { type: 'linear', value: 1, time: 2 + FADE_SECONDS }]);
  player.schedule(2 + FADE_SECONDS / 2);
  assert.equal(oldGain.disconnected, false);
  player.schedule(2 + FADE_SECONDS + 0.01);
  assert.equal(oldGain.disconnected, true);
});

test('no song fades the music out', () => {
  const { context, mixer, player, played } = setUp();
  player.play('one', 0);
  player.schedule(0);
  const gain = context.nodes.filter((node) => node.kind === 'gain' && node.outputs.includes(mixer.music)).at(-1);
  const count = played().length;
  player.play(null, 1);
  player.schedule(1);
  assert.equal(player.playing, null);
  assert.equal(gain.gain.events.at(-1).value, 0);
  assert.equal(played().length, count);
});

test('after a long stall it does not rush out the notes it missed', () => {
  const { player, played } = setUp();
  player.play('one', 0);
  player.schedule(0);
  const count = played().length;
  player.schedule(30);
  const late = played().slice(count).map((source) => source.started);
  assert.ok(late.every((time) => time >= 30));
});

test('stopping lets every song go', () => {
  const { context, mixer, player } = setUp();
  player.play('one', 0);
  player.stop();
  assert.equal(player.playing, null);
  assert.ok(context.nodes.filter((node) => node.kind === 'gain' && node.disconnected).length >= 1);
  assert.equal(mixer.music.disconnected, false);
});
