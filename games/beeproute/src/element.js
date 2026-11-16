import { defineCanvasGame, roomHeight } from "../../../kit/src/canvas/index.js";
import { drawFrame } from "./frame.js";
import { createGame } from "./game.js";
import { labelFor, say } from "./labels.js";
import { themeFor } from "./theme.js";

export { roomHeight };

const heldAt = (state, at) => (state.build ? `${state.build.level.cells[at]}${state.build.level.start.at === at ? state.build.level.start.dir : ""}` : "");
const plain = (target) => (target.kind === "cell" ? { ...target, value: target.value[0] } : target);

function forLabels(game) {
  return Object.assign(Object.create(game), {
    targets: () => game.targets().map((target) => (target.kind === "cell" ? { ...target, value: [target.value, heldAt(game.state, target.value)] } : target)),
    press: (target) => game.press(plain(target)),
  });
}

export function defineBeepRoute(tag, version = "1.0.0") {
  defineCanvasGame(tag, {
    version,
    create: (env) => forLabels(createGame(env)),
    draw: drawFrame,
    theme: themeFor,
    label: (target, game) => labelFor(plain(target), game.state),
    canvasLabel: (lang) => say(lang, "canvas"),
    music: "calm",
  });
}
