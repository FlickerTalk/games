import { hold, noise, note, pluck } from "../../../kit/src/sound/index.js";

const SOUND_KEY = "sound";
const QUIET_START = JSON.stringify({ volume: 1, music: false });

const riffle = Array.from({ length: 9 }, (_, at) => noise(at * 0.042, 0.03, 0.05 - at * 0.003, { type: "bandpass", frequency: 2600 - at * 90, q: 1.2 }));

export const CARD_EFFECTS = Object.freeze({
  "cards-pick": { duck: 0, voices: [pluck("triangle", note("A4"), 0, 0.05, 0.05)] },
  "cards-card": {
    duck: 0,
    voices: [noise(0, 0.045, 0.08, { type: "bandpass", frequency: 2200, q: 1.1 }), pluck("triangle", note("E4"), 0, 0.06, 0.04, { toFrequency: note("B3") })],
  },
  "cards-draw": { duck: 0, voices: [noise(0, 0.12, 0.05, { type: "bandpass", frequency: 1800, q: 0.9, toFrequency: 3200 })] },
  "cards-deal": { duck: 0, voices: riffle },
  "cards-end": { duck: 0, voices: [hold("sine", note("D4"), 0, 0.42, 0.05, { release: 0.2 }), hold("sine", note("A4"), 0, 0.42, 0.03, { release: 0.2 })] },
});

export const CARD_CUES = Object.freeze({ mine: null, theirs: null, won: "cards-end", lost: "cards-end", draw: "cards-end" });

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
