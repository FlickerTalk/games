import { defineCanvasGame } from "../../../kit/src/canvas/index.js";
import { note, pluck } from "../../../kit/src/sound/index.js";
import { drawFrame } from "./frame.js";
import { createGame } from "./game.js";
import { labelFor, say } from "./labels.js";
import { themeFor } from "./theme.js";

const BELL = {
  duck: 0,
  voices: [pluck("sine", note("E6"), 0, 0.5, 0.3), pluck("sine", note("B6"), 0, 0.35, 0.14), pluck("triangle", note("E5"), 0, 0.3, 0.08)],
};

export function defineFoamDuel(tag, version = "1.0.0") {
  defineCanvasGame(tag, {
    version,
    create: (env) => createGame(env),
    draw: drawFrame,
    theme: themeFor,
    label: (target, game) => labelFor(target, game.state, game.duel?.status ?? null),
    canvasLabel: (lang) => say(lang, "canvas"),
    music: "playful",
    sound: { effects: { bell: BELL } },
  });
}
