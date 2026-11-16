import { note } from "../../../kit/src/sound/notes.js";
import { pluck } from "../../../kit/src/sound/voices.js";

export const SOUND = Object.freeze({
  effects: {
    clink: { voices: [pluck("sine", note("E6"), 0, 0.38, 0.28), pluck("triangle", note("B6"), 0.01, 0.3, 0.1), pluck("sine", note("E7"), 0.02, 0.2, 0.05)] },
    giggle: {
      voices: [
        pluck("sine", note("A5"), 0, 0.08, 0.16, { toFrequency: note("C6") }),
        pluck("sine", note("C6"), 0.09, 0.08, 0.16, { toFrequency: note("E6") }),
        pluck("sine", note("B5"), 0.18, 0.1, 0.14, { toFrequency: note("D6") }),
      ],
    },
  },
});
