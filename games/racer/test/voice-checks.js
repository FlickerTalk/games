import assert from 'node:assert/strict';

const SOFT_WAVES = new Set(['sine', 'triangle', 'noise']);
const FILTERS = new Set(['lowpass', 'highpass', 'bandpass']);

export function assertVoice(voice, label, { highest = 2200, lowest = 40 } = {}) {
  assert.ok(SOFT_WAVES.has(voice.wave), `${label}: wave ${voice.wave}`);
  assert.ok(voice.start >= 0, `${label}: start`);
  assert.ok(voice.duration > 0 && voice.duration <= 2, `${label}: duration ${voice.duration}`);
  assert.ok(voice.gain > 0 && voice.gain <= 0.4, `${label}: gain ${voice.gain}`);
  assert.ok(voice.attack >= 0.002 && voice.attack < voice.duration, `${label}: attack`);
  assert.ok(voice.shape === 'pluck' || voice.shape === 'hold', `${label}: shape`);
  for (const frequency of [voice.frequency, voice.toFrequency].filter((value) => value !== undefined)) {
    assert.ok(frequency >= lowest && frequency <= highest, `${label}: ${frequency} Hz`);
  }
  assert.equal(voice.wave === 'noise', voice.frequency === undefined, `${label}: noise has no pitch, a tone has one`);
  if (voice.filter) {
    assert.ok(FILTERS.has(voice.filter.type), `${label}: filter`);
    assert.ok(voice.filter.frequency > 20 && voice.filter.frequency < 12000, `${label}: filter frequency`);
  }
}

export function loudestMoment(voices) {
  return Math.max(...voices.map((one) => voices
    .filter((other) => other.start <= one.start && one.start < other.start + other.duration)
    .reduce((sum, other) => sum + other.gain, 0)));
}

export const lastsFor = (voices) => Math.max(...voices.map((voice) => voice.start + voice.duration));
