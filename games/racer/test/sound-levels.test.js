import { test } from 'vitest';
import assert from 'node:assert/strict';
import { MASTER_LEVEL, MUSIC_LEVEL, DUCKED_SHARE, LIMITER } from '../src/sound-levels.js';
import { SONGS } from '../src/sound-songs.js';
import { compileScore } from '../src/sound-score.js';
import { instrumentVoices } from '../src/sound-instruments.js';
import { cueSound } from '../src/sound-cues.js';
import { ENGINE_LOUDEST, engineTone } from '../src/sound-engine-tone.js';
import { loudestMoment } from './voice-checks.js';

function songVoices(score) {
  return compileScore(score).events.flatMap((event) => instrumentVoices(event).map((voice) => ({ ...voice, start: event.time + voice.start })));
}

test('the whole game goes out at a moderate level through a limiter that catches any peak', () => {
  assert.ok(MASTER_LEVEL >= 0.3 && MASTER_LEVEL <= 0.6);
  assert.ok(LIMITER.threshold <= -10 && LIMITER.ratio >= 10 && LIMITER.attack <= 0.005);
});

test('the music, even at its loudest moment, stays under half of a countdown tick or a bump', () => {
  const quietestCue = Math.min(loudestMoment(cueSound('tick').voices), loudestMoment(cueSound('bump').voices));
  for (const [name, score] of Object.entries(SONGS)) {
    const loudest = loudestMoment(songVoices(score)) * MUSIC_LEVEL;
    assert.ok(loudest <= quietestCue / 2, `${name}: ${loudest.toFixed(3)} against ${quietestCue}`);
  }
});

test('the engine hums between 0.0224 standing still and 0.0616 flat out, well under the race music, and still purrs standing still', () => {
  const raceMusic = loudestMoment(songVoices(SONGS.race)) * MUSIC_LEVEL;
  const flatOut = engineTone({ share: 1, pressing: true }).gain;
  const idle = engineTone({ share: 0, pressing: false }).gain;
  assert.ok(Math.abs(idle - 0.0224) < 1e-9, `${idle}`);
  assert.ok(Math.abs(ENGINE_LOUDEST - 0.0616) < 1e-9 && Math.abs(flatOut - 0.0616) < 1e-9, `${flatOut}`);
  assert.ok(ENGINE_LOUDEST / raceMusic >= 0.4 && ENGINE_LOUDEST / raceMusic <= 0.46, `${(ENGINE_LOUDEST / raceMusic).toFixed(3)}`);
  assert.ok(idle >= raceMusic * 0.14, `${idle} against ${raceMusic.toFixed(3)}`);
});

test('under a tune the music steps well back, without stopping', () => {
  assert.ok(DUCKED_SHARE > 0 && DUCKED_SHARE <= 0.4);
});
