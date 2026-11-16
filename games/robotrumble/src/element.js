import { defineCanvasGame } from "../../../kit/src/canvas/index.js";
import { note, pluck } from "../../../kit/src/sound/index.js";
import { drawFrame } from "./frame.js";
import { createGame } from "./game.js";
import { labelFor, say } from "./labels.js";
import { themeFor } from "./theme.js";

export const SOUND = {
  effects: {
    boing: { duck: 0, voices: [pluck("sine", note("A4"), 0, 0.24, 0.2, { toFrequency: note("A5") }), pluck("triangle", note("A3"), 0, 0.09, 0.1)] },
    sproing: { duck: 0, voices: [pluck("triangle", note("E5"), 0, 0.3, 0.18, { toFrequency: note("B3") }), pluck("sine", note("E4"), 0.06, 0.2, 0.1, { toFrequency: note("E5") })] },
  },
};

export function defineRobotRumble(tag, version = "1.0.0") {
  defineCanvasGame(tag, {
    version,
    create: (env) => createGame(env),
    draw: drawFrame,
    theme: themeFor,
    label: (target, game) => labelFor(target, game.state, game.duel?.status ?? null),
    canvasLabel: (lang) => say(lang, "canvas"),
    music: "playful",
    sound: SOUND,
  });
}
