import { defineCanvasGame, roomHeight } from "../../../kit/src/canvas/index.js";
import { drawFrame } from "./frame.js";
import { createGame } from "./game.js";
import { labelFor, say } from "./labels.js";
import { golemOf, turnOf } from "./round.js";
import { SOUND } from "./sounds.js";
import { themeFor } from "./theme.js";

export { roomHeight };

const plain = (target) => (target.kind === "hit" ? { ...target, value: target.value[0] } : target);

function telling({ round }, divisor) {
  if (!round || round.core.over) return [divisor];
  return [divisor, round.core.value, golemOf(round.core).cap, turnOf(round.core) === round.mySide];
}

// A label is refreshed only when its target changes, so what a divisor's label says is carried in the target's value.
function forLabels(game) {
  return Object.assign(Object.create(game), {
    targets: () => game.targets().map((target) => (target.kind === "hit" ? { ...target, value: telling(game.state, target.value) } : target)),
    press: (target) => game.press(plain(target)),
  });
}

export function defineShardSplitter(tag, version = "1.0.0") {
  defineCanvasGame(tag, {
    version,
    create: (env) => forLabels(createGame(env)),
    draw: drawFrame,
    theme: themeFor,
    label: (target, game) => labelFor(plain(target), game.state),
    canvasLabel: (lang) => say(lang, "canvas"),
    music: "playful",
    sound: SOUND,
  });
}
