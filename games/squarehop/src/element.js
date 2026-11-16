import { defineCanvasGame, roomHeight } from "../../../kit/src/canvas/index.js";
import { drawFrame } from "./frame.js";
import { createGame } from "./game.js";
import { labelFor, say } from "./labels.js";
import { themeFor } from "./theme.js";

export { roomHeight };

export function defineSquareHop(tag, version = "1.0.0") {
  defineCanvasGame(tag, {
    version,
    create: createGame,
    draw: drawFrame,
    theme: themeFor,
    label: (target, game) => labelFor(target, game.state, game.duel?.status ?? null),
    canvasLabel: (lang) => say(lang, "canvas"),
    music: "playful",
  });
}
