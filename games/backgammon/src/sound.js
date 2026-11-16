import { hold, noise, note, pluck } from "../../../kit/src/sound/index.js";

const SOUND_KEY = "sound";
const QUIET_START = JSON.stringify({ volume: 1, music: false });

const click = (start, frequency, gain) => noise(start, 0.03, gain, { type: "bandpass", frequency, q: 1.8 });

export const BACKGAMMON_EFFECTS = Object.freeze({
  "bg-pick": { duck: 0, voices: [pluck("triangle", note("A4"), 0, 0.05, 0.05)] },
  "bg-move": { duck: 0, voices: [click(0, 1300, 0.07), pluck("triangle", note("D4"), 0, 0.07, 0.05, { toFrequency: note("A3") })] },
  "bg-hit": { duck: 0, voices: [click(0, 1000, 0.08), click(0.07, 1500, 0.06), pluck("triangle", note("A3"), 0, 0.1, 0.07, { toFrequency: note("E3") })] },
  "bg-dice": { duck: 0, voices: [click(0, 2600, 0.05), click(0.06, 2200, 0.05), click(0.13, 2900, 0.04), click(0.22, 2400, 0.03)] },
  "bg-end": { duck: 0, voices: [hold("sine", note("D4"), 0, 0.42, 0.05, { release: 0.2 }), hold("sine", note("A4"), 0, 0.42, 0.03, { release: 0.2 })] },
});

export const BACKGAMMON_CUES = Object.freeze({ mine: null, theirs: null, won: "bg-end", lost: "bg-end", draw: "bg-end" });

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
