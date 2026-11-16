import { hold, noise, note, pluck } from "../../../kit/src/sound/index.js";

const SOUND_KEY = "sound";
const QUIET_START = JSON.stringify({ volume: 1, music: false });

export const CHESS_EFFECTS = Object.freeze({
  "chess-pick": { duck: 0, voices: [pluck("triangle", note("A4"), 0, 0.05, 0.05)] },
  "chess-move": {
    duck: 0,
    voices: [noise(0, 0.035, 0.07, { type: "bandpass", frequency: 1400, q: 1.6 }), pluck("triangle", note("D4"), 0, 0.07, 0.06, { toFrequency: note("A3") })],
  },
  "chess-take": {
    duck: 0,
    voices: [noise(0, 0.05, 0.08, { type: "bandpass", frequency: 900, q: 1.4 }), pluck("triangle", note("A3"), 0, 0.1, 0.08, { toFrequency: note("E3") })],
  },
  "chess-end": { duck: 0, voices: [hold("sine", note("D4"), 0, 0.42, 0.05, { release: 0.2 }), hold("sine", note("A4"), 0, 0.42, 0.03, { release: 0.2 })] },
});

export const CHESS_CUES = Object.freeze({ mine: "chess-move", theirs: "chess-move", won: "chess-end", lost: "chess-end", draw: "chess-end" });

export function musicOffAtFirst(ft) {
  const store = ft?.store;
  return {
    ...ft,
    store: {
      ...store,
      get: async (key) => {
        const kept = await store?.get(key);
        return key === SOUND_KEY && (kept === null || kept === undefined) ? QUIET_START : (kept ?? null);
      },
      set: (key, value) => store?.set(key, value),
      forget: (key) => store?.forget(key),
    },
  };
}
