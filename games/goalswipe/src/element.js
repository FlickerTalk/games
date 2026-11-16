import { defineCanvasGame } from "../../../kit/src/canvas/index.js";
import { drawFrame } from "./frame.js";
import { createGame } from "./game.js";
import { labelFor, say } from "./labels.js";
import { themeFor } from "./theme.js";

export function defineGoalSwipe(tag, version = "1.0.0") {
  defineCanvasGame(tag, {
    version,
    create: (env) => createGame(env),
    draw: drawFrame,
    theme: themeFor,
    label: (target, game) => labelFor(target, game.state, game.friend?.status ?? null),
    canvasLabel: (lang) => say(lang, "canvas"),
    music: "playful",
  });
}
