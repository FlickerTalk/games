import { defineCanvasGame, roomHeight } from "../../../kit/src/canvas/index.js";
import { drawFrame } from "./frame.js";
import { createGame } from "./game.js";
import { labelFor, say } from "./labels.js";
import { themeFor } from "./theme.js";

export { roomHeight };

export const SEA = Object.freeze([
  { wave: "noise", gain: 0.34, filter: { type: "lowpass", frequency: 520 }, wobble: { rate: 0.14, depth: 0.5 } },
  { wave: "noise", gain: 0.12, filter: { type: "bandpass", frequency: 1400 }, wobble: { rate: 0.09, depth: 0.7 } },
]);

export function defineLittlePier(tag, version = "1.0.0") {
  defineCanvasGame(tag, {
    version,
    create: (env) => createGame(env),
    draw: drawFrame,
    theme: themeFor,
    label: (target, game) => labelFor(target, game.state),
    canvasLabel: (lang) => say(lang, "canvas"),
    music: "calm",
    sound: { drones: { sea: SEA } },
  });
}
