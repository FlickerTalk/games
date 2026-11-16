import { hold, noise, note, pluck } from "../../../kit/src/sound/index.js";
import { beatsOf, kindOf } from "./train.js";

export const INSTRUMENTS = Object.freeze(["drum", "bell", "whistle", "shaker", "chime", "clapper", "tambourine", "horn"]);
export const STEP_MS = 480;
const TAIL_MS = 320;
const DUCK = 0.5;

const voiced = (voices) => ({ duck: DUCK, voices });

export const SOUND = Object.freeze({
  effects: {
    drum: voiced([pluck("sine", 150, 0, 0.22, 0.5, { toFrequency: 70 }), noise(0, 0.05, 0.12, { type: "lowpass", frequency: 900, q: 0.7 })]),
    bell: voiced([pluck("sine", note("E5"), 0, 0.42, 0.3), pluck("triangle", note("E6"), 0, 0.2, 0.08)]),
    whistle: voiced([hold("sine", note("G5"), 0, 0.2, 0.22, { toFrequency: note("A5"), release: 0.06 })]),
    shaker: voiced([noise(0, 0.09, 0.2, { type: "highpass", frequency: 5200, q: 0.7 }), noise(0.08, 0.07, 0.12, { type: "highpass", frequency: 6000, q: 0.7 })]),
    chime: voiced([pluck("sine", note("C6"), 0, 0.4, 0.22), pluck("sine", note("G6"), 0.05, 0.34, 0.12)]),
    clapper: voiced([noise(0, 0.045, 0.34, { type: "bandpass", frequency: 1400, q: 1.6 }), pluck("triangle", note("D5"), 0, 0.05, 0.08)]),
    tambourine: voiced([noise(0, 0.12, 0.2, { type: "highpass", frequency: 3800, q: 0.9 }), pluck("triangle", note("A5"), 0, 0.14, 0.1)]),
    horn: voiced([hold("triangle", note("C4"), 0, 0.26, 0.3, { release: 0.08 }), hold("sine", note("C5"), 0, 0.24, 0.08, { release: 0.08 })]),
  },
});

export function tuneOf(wagons) {
  return wagons.flatMap((wagon, index) => {
    const beats = beatsOf(wagon);
    return Array.from({ length: beats }, (_, beat) => ({ at: index * STEP_MS + (beat * STEP_MS) / beats, index, beat }));
  });
}

export const tuneLength = (wagons) => wagons.length * STEP_MS + TAIL_MS;

export const playWagon = (sound, wagon, options = {}) => sound.play(INSTRUMENTS[kindOf(wagon)], options);
