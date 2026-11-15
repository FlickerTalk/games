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

const higher = (value, pitch) => (value === undefined ? undefined : value * pitch);

function retuned(voice, pitch) {
  const tuned = { ...voice, frequency: higher(voice.frequency, pitch), toFrequency: higher(voice.toFrequency, pitch) };
  if (voice.filter) tuned.filter = { ...voice.filter, frequency: voice.filter.frequency * pitch, toFrequency: higher(voice.filter.toFrequency, pitch) };
  return tuned;
}

export function scaled(voices, { gain, pitch, delay } = {}) {
  const loud = Number.isFinite(gain) ? Math.min(1, Math.max(0, gain)) : 1;
  const high = Number.isFinite(pitch) && pitch > 0 ? pitch : 1;
  const late = Number.isFinite(delay) && delay > 0 ? delay : 0;
  return voices.map((voice) => ({ ...(high === 1 ? voice : retuned(voice, high)), gain: voice.gain * loud, start: voice.start + late }));
}
