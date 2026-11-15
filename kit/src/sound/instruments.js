import { hold, noise, pluck } from "./voices.js";

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

const DRUMS = {
  k: () => [pluck("sine", 150, 0, 0.16, 0.3, { attack: 0.002, toFrequency: 50 }), noise(0, 0.04, 0.05, { type: "lowpass", frequency: 1200, q: 0.7 })],
  h: () => [noise(0, 0.05, 0.07, { type: "highpass", frequency: 7000, q: 0.7 })],
  s: () => [noise(0, 0.13, 0.11, { type: "bandpass", frequency: 1900, q: 0.9 }), pluck("triangle", 200, 0, 0.07, 0.05, { toFrequency: 160 })],
};

const PLAYERS = {
  flute: ({ frequency, duration }) => {
    const length = duration * 0.92;
    const envelope = { attack: 0.04, release: Math.min(0.18, length / 2) };
    return [hold("sine", frequency, 0, length, 0.28, envelope), hold("triangle", frequency * 2, 0, length, 0.03, envelope)];
  },
  harp: ({ frequency, duration }) => [pluck("triangle", frequency, 0, clamp(duration * 2, 0.3, 1), 0.15)],
  bell: ({ frequency, duration }) => [
    pluck("sine", frequency, 0, clamp(duration * 1.6, 0.2, 0.7), 0.24, { attack: 0.003 }),
    hold("triangle", frequency, 0, duration * 0.85, 0.07, { attack: 0.01, release: 0.05 }),
    pluck("sine", frequency * 2, 0, 0.06, 0.04, { attack: 0.002 }),
  ],
  bass: ({ frequency, duration }) => {
    const length = duration * 0.85;
    const envelope = { attack: 0.008, release: Math.min(0.06, length / 2) };
    return [
      hold("triangle", frequency, 0, length, 0.26, { ...envelope, filter: { type: "lowpass", frequency: 900, q: 0.7 } }),
      hold("sine", frequency, 0, length, 0.12, envelope),
    ];
  },
  drums: ({ sound }) => {
    if (!Object.hasOwn(DRUMS, sound)) throw new Error(`unknown drum: ${sound}`);
    return DRUMS[sound]();
  },
};

export const INSTRUMENTS = Object.keys(PLAYERS);

export function instrumentVoices(event) {
  if (!Object.hasOwn(PLAYERS, event.instrument)) throw new Error(`unknown instrument: ${event.instrument}`);
  const volume = event.volume ?? 1;
  return PLAYERS[event.instrument](event).map((voice) => ({ ...voice, gain: voice.gain * volume }));
}
