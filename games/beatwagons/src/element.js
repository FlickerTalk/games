import { defineCanvasGame, roomHeight } from "../../../kit/src/canvas/index.js";
import { drawFrame } from "./frame.js";
import { createGame } from "./game.js";
import { labelFor, say } from "./labels.js";
import { themeFor } from "./theme.js";
import { SOUND } from "./tune.js";

export { roomHeight };

const TOLD = ["candidate", "wagon", "dots", "slot"];
const plain = (target) => (TOLD.includes(target.kind) ? { ...target, value: target.value[0] } : target);

function telling(state, target) {
  const { round, build } = state;
  if (target.kind === "candidate") return [target.value, round?.candidates[target.value]];
  if (target.kind === "slot") return [target.value, build?.hidden[target.value] ? 1 : 0];
  return [target.value, build?.beats];
}

// A label is refreshed only when its target changes, so what a label says is carried in the target's value.
function forLabels(game) {
  return Object.assign(Object.create(game), {
    targets: () => game.targets().map((target) => (TOLD.includes(target.kind) ? { ...target, value: telling(game.state, target) } : target)),
    press: (target) => game.press(plain(target)),
  });
}

export function defineBeatWagons(tag, version = "1.0.0") {
  defineCanvasGame(tag, {
    version,
    create: (env) => forLabels(createGame(env)),
    draw: drawFrame,
    theme: themeFor,
    label: (target, game) => labelFor(plain(target), game.state),
    canvasLabel: (lang) => say(lang, "canvas"),
    music: "calm",
    sound: SOUND,
  });
}
