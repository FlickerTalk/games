import { note as hz } from "./notes.js";
import { hold, noise, pluck, scaled } from "./voices.js";

const bell = (name, start, duration, gain) => [pluck("sine", hz(name), start, duration, gain), pluck("triangle", hz(name) / 2, start, duration * 0.8, gain * 0.3)];

const run = (names, every, duration, gain) => names.map((name, at) => pluck("sine", hz(name), at * every, duration, gain));

const WIN = [["C5", 0], ["E5", 0.12], ["G5", 0.24], ["E5", 0.4], ["G5", 0.52]];

export const EFFECTS = {
  tap: { duck: 0, voices: [pluck("triangle", hz("G5"), 0, 0.07, 0.12), pluck("sine", hz("G6"), 0, 0.03, 0.03)] },
  place: { duck: 0, voices: [pluck("triangle", hz("C5"), 0, 0.12, 0.2, { toFrequency: hz("G4") }), noise(0, 0.03, 0.04, { type: "bandpass", frequency: 1800, q: 1.2 })] },
  pick: { duck: 0, voices: [pluck("triangle", hz("E5"), 0, 0.08, 0.13), pluck("triangle", hz("B5"), 0.07, 0.1, 0.13)] },
  pop: { duck: 0, voices: [pluck("sine", 600, 0, 0.09, 0.2, { toFrequency: 1100 })] },
  success: { duck: 0.6, voices: [...run(["C5", "E5", "G5"], 0.09, 0.24, 0.14), pluck("sine", hz("C6"), 0.27, 0.45, 0.14)] },
  star: { duck: 0.5, voices: run(["A5", "C#6", "E6", "A6"], 0.06, 0.3, 0.1) },
  win: {
    duck: 1.6,
    voices: [
      ...WIN.flatMap(([name, start]) => bell(name, start, 0.12, 0.2)),
      ...bell("C6", 0.64, 0.75, 0.2),
      hold("sine", hz("E5"), 0.64, 0.7, 0.05),
      hold("sine", hz("G5"), 0.64, 0.7, 0.05),
    ],
  },
  "lose-soft": {
    duck: 1,
    voices: [
      hold("triangle", hz("G4"), 0, 0.26, 0.15, { release: 0.1 }),
      hold("sine", hz("G4"), 0, 0.26, 0.08, { release: 0.1 }),
      hold("triangle", hz("C5"), 0.3, 0.45, 0.15, { release: 0.25 }),
      hold("sine", hz("C5"), 0.3, 0.45, 0.08, { release: 0.25 }),
    ],
  },
  "error-soft": { duck: 0, voices: [pluck("triangle", hz("D4"), 0, 0.08, 0.1), pluck("triangle", hz("B3"), 0.1, 0.1, 0.1)] },
  tick: { duck: 0, voices: [pluck("sine", hz("E5"), 0, 0.16, 0.26), pluck("triangle", hz("E6"), 0, 0.07, 0.04)] },
  whoosh: { duck: 0, voices: [noise(0, 0.42, 0.15, { type: "bandpass", frequency: 350, toFrequency: 2200, q: 1.4 }, { shape: "hold", attack: 0.18, release: 0.22 })] },
  splash: {
    duck: 0,
    voices: [
      noise(0, 0.38, 0.2, { type: "bandpass", frequency: 1600, toFrequency: 450, q: 0.8 }),
      noise(0.06, 0.18, 0.05, { type: "highpass", frequency: 3500, q: 0.7 }),
      pluck("sine", 520, 0.14, 0.09, 0.07, { toFrequency: 980 }),
      pluck("sine", 610, 0.24, 0.08, 0.05, { toFrequency: 1150 }),
    ],
  },
  bounce: { duck: 0, voices: [pluck("sine", 180, 0, 0.18, 0.25, { toFrequency: 420 }), pluck("sine", 240, 0.16, 0.14, 0.12, { toFrequency: 480 })] },
  collect: { duck: 0, voices: [pluck("sine", hz("A5"), 0, 0.08, 0.14), pluck("sine", hz("E6"), 0.06, 0.24, 0.16), pluck("triangle", hz("E5"), 0.06, 0.18, 0.04)] },
};

export function effectVoices(effects, name, options) {
  if (!Object.hasOwn(effects, name)) return null;
  const effect = effects[name];
  return { duck: effect.duck ?? 0, voices: scaled(effect.voices, options) };
}
