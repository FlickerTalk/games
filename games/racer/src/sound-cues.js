import { noteFrequency as hz } from './sound-pitch.js';
import { pluck, hold, noise } from './sound-voices.js';

const bell = (note, start, duration, gain) => [
  pluck('sine', hz(note), start, duration, gain),
  pluck('triangle', hz(note) / 2, start, duration * 0.8, gain * 0.3),
];

const WIN_NOTES = [['C5', 0], ['E5', 0.12], ['G5', 0.24], ['E5', 0.4], ['G5', 0.52]];
const GIFT_NOTES = ['G5', 'A5', 'C6', 'D6', 'E6', 'G6', 'A6'];

const CUES = {
  tick: { duck: 0, voices: [pluck('sine', hz('E5'), 0, 0.16, 0.26), pluck('triangle', hz('E6'), 0, 0.07, 0.04)] },
  go: { duck: 0, voices: [pluck('sine', hz('B5'), 0, 0.45, 0.26), pluck('sine', hz('E6'), 0, 0.3, 0.08), pluck('triangle', hz('B4'), 0, 0.3, 0.08)] },
  bump: {
    duck: 0,
    voices: [
      pluck('sine', 170, 0, 0.2, 0.34, { toFrequency: 75 }),
      pluck('triangle', 260, 0.03, 0.26, 0.11, { toFrequency: 520, filter: { type: 'lowpass', frequency: 1400, q: 0.7 } }),
    ],
  },
  splash: {
    duck: 0,
    voices: [
      noise(0, 0.38, 0.2, { type: 'bandpass', frequency: 1600, toFrequency: 450, q: 0.8 }),
      noise(0.06, 0.18, 0.05, { type: 'highpass', frequency: 3500, q: 0.7 }),
      pluck('sine', 520, 0.14, 0.09, 0.07, { toFrequency: 980 }),
      pluck('sine', 610, 0.24, 0.08, 0.05, { toFrequency: 1150 }),
    ],
  },
  whoosh: {
    duck: 0,
    voices: [noise(0, 0.42, 0.15, { type: 'bandpass', frequency: 350, toFrequency: 2200, q: 1.4 }, { shape: 'hold', attack: 0.18, release: 0.22 })],
  },
  finish: { duck: 0.6, voices: [...bell('C6', 0, 0.3, 0.17), ...bell('E6', 0.12, 0.4, 0.17)] },
  win: {
    duck: 1.6,
    voices: [
      ...WIN_NOTES.flatMap(([note, start]) => bell(note, start, 0.12, 0.2)),
      ...bell('C6', 0.64, 0.75, 0.2),
      hold('sine', hz('E5'), 0.64, 0.7, 0.05),
      hold('sine', hz('G5'), 0.64, 0.7, 0.05),
    ],
  },
  lose: {
    duck: 1,
    voices: [
      hold('triangle', hz('G4'), 0, 0.26, 0.15, { release: 0.1 }),
      hold('sine', hz('G4'), 0, 0.26, 0.08, { release: 0.1 }),
      hold('triangle', hz('C5'), 0.3, 0.45, 0.15, { release: 0.25 }),
      hold('sine', hz('C5'), 0.3, 0.45, 0.08, { release: 0.25 }),
    ],
  },
  gift: {
    duck: 1.6,
    voices: [
      ...GIFT_NOTES.map((note, index) => pluck('sine', hz(note), 0.05 + index * 0.08, 0.28, 0.1)),
      ...['C6', 'E6', 'G6'].map((note) => pluck('sine', hz(note), 0.72, 0.7, 0.07)),
      pluck('sine', hz('C7'), 0.72, 0.6, 0.04),
    ],
  },
  tap: { duck: 0, voices: [pluck('triangle', hz('G5'), 0, 0.07, 0.12), pluck('sine', hz('G6'), 0, 0.03, 0.03)] },
  pick: { duck: 0, voices: [pluck('triangle', hz('E5'), 0, 0.08, 0.13), pluck('triangle', hz('B5'), 0.07, 0.1, 0.13)] },
  nudge: { duck: 0, voices: [pluck('triangle', 294, 0, 0.07, 0.1), pluck('triangle', 330, 0.08, 0.07, 0.1), pluck('triangle', 294, 0.16, 0.08, 0.1)] },
};

export const CUE_NAMES = Object.keys(CUES);

export function cueSound(name) {
  return Object.hasOwn(CUES, name) ? CUES[name] : null;
}
