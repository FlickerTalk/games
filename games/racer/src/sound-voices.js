export const pluck = (wave, frequency, start, duration, gain, extra = {}) => ({
  wave, frequency, start, duration, gain, attack: 0.004, shape: 'pluck', ...extra,
});

export const hold = (wave, frequency, start, duration, gain, extra = {}) => ({
  wave, frequency, start, duration, gain, attack: 0.02, release: Math.min(0.12, duration / 2), shape: 'hold', ...extra,
});

export const noise = (start, duration, gain, filter, extra = {}) => ({
  wave: 'noise', start, duration, gain, attack: 0.003, shape: 'pluck', filter, ...extra,
});
