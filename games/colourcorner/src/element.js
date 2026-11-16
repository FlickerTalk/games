import { defineCanvasGame, roomHeight } from "../../../kit/src/canvas/index.js";
import { pictureData } from "./export.js";
import { drawFrame } from "./frame.js";
import { createGame } from "./game.js";
import { labelFor, say } from "./labels.js";
import { openPages } from "./levels.js";
import { themeFor } from "./theme.js";

export { roomHeight };

export function defineColourCorner(tag, version = "1.0.0") {
  defineCanvasGame(tag, {
    version,
    create: (env) => createGame({ ...env, picture: (picture) => pictureData(picture) }),
    draw: drawFrame,
    theme: themeFor,
    label: (target, game) => labelFor(target, { ...game.state, owned: openPages(game.state.progress) }),
    button: (target) => target.kind !== "volume",
    canvasLabel: (lang) => say(lang, "canvas"),
    music: "calm",
  });
}
