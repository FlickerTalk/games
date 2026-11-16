import manifest from "../module.json";
import { defineGame } from "../../../kit/src/index.js";
import { withSound } from "../../../kit/src/sound/index.js";
import { withPortraits } from "../../../kit/src/avatars/portraits.js";
import { board, MARKS, STYLE } from "./board.js";
import { TEXTS } from "./texts.js";
import { initial, play, result, turn } from "./rules.js";
import { robot } from "./robot.js";
import { EIGHTS_CUES, EIGHTS_EFFECTS, musicOffAtFirst } from "./sound.js";

export const game = defineGame(
  withSound(
    {
      id: "eights",
      gv: 1,
      tag: manifest.components[0],
      app: manifest.version,
      icon: "🃏",
      initial,
      turn,
      play,
      result,
      robot,
      board: withPortraits(board),
      sides: MARKS,
      style: STYLE,
      texts: TEXTS,
      minBoard: 300,
      how: (ended, t) => t(ended.reason === "out" ? "wentOut" : ended.reason === "stuck" ? "stuck" : "deckCheat"),
    },
    { tune: "calm", cues: EIGHTS_CUES, effects: EIGHTS_EFFECTS },
    { ft: musicOffAtFirst(globalThis.ft) },
  ),
);
