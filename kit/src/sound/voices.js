const SILENT = 0.0001;

export const pluck = (wave, frequency, start, duration, gain, extra = {}) => ({
  wave, frequency, start, duration, gain, attack: 0.004, shape: "pluck", ...extra,
});

export const hold = (wave, frequency, start, duration, gain, extra = {}) => ({
  wave, frequency, start, duration, gain, attack: 0.02, release: Math.min(0.12, duration / 2), shape: "hold", ...extra,
});

export const noise = (start, duration, gain, filter, extra = {}) => ({
  wave: "noise", start, duration, gain, attack: 0.003, shape: "pluck", filter, ...extra,
});

export function shape(voice, at) {
  const start = at + voice.start;
  const end = start + voice.duration;
  const peak = Math.min(start + voice.attack, end);
  const rise = [["set", 0, start], ["linear", voice.gain, peak]];
  if (voice.shape === "hold") return [...rise, ["set", voice.gain, Math.max(peak, end - voice.release)], ["linear", 0, end]];
  return [...rise, ["exponential", SILENT, end], ["set", 0, end]];
}

const factor = (value, fallback, valid) => (Number.isFinite(value) && valid(value) ? value : fallback);

const times = (value, by) => (value === undefined ? {} : { [by[0]]: value * by[1] });

function moved(voice, pitch) {
  if (pitch === 1) return {};
  const filter = voice.filter && { ...voice.filter, frequency: voice.filter.frequency * pitch, ...times(voice.filter.toFrequency, ["toFrequency", pitch]) };
  return { ...times(voice.frequency, ["frequency", pitch]), ...times(voice.toFrequency, ["toFrequency", pitch]), ...(filter ? { filter } : {}) };
}

export function scaled(voices, { gain, pitch, delay } = {}) {
  const loud = Math.min(1, Math.max(0, factor(gain, 1, () => true)));
  const high = factor(pitch, 1, (value) => value > 0);
  const late = factor(delay, 0, (value) => value > 0);
  return voices.map((voice) => ({ ...voice, gain: voice.gain * loud, start: voice.start + late, ...moved(voice, high) }));
}
