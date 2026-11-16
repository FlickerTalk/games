import manifest from "../module.json";
import { defineGame } from "../../../kit/src/index.js";
import { withSound } from "../../../kit/src/sound/index.js";
import { withPortraits } from "../../../kit/src/avatars/portraits.js";
import { SIDES, STYLE, board } from "./board.js";
import { initial, play, result, turn } from "./rules.js";
import { robot } from "./robot.js";
import { CHESS_CUES, CHESS_EFFECTS, musicOffAtFirst } from "./sound.js";
import { how, summary } from "./summary.js";
import { TEXTS } from "./texts.js";

export const game = defineGame(
  withSound(
    {
      id: "chess",
      gv: 1,
      tag: manifest.components[0],
      app: manifest.version,
      icon: "♟️",
      initial,
      turn,
      play,
      result,
      robot,
      board: withPortraits(board),
      sides: SIDES,
      style: STYLE,
      texts: TEXTS,
      summary,
      how,
      minBoard: 320,
    },
    { tune: "calm", cues: CHESS_CUES, effects: CHESS_EFFECTS },
    { ft: musicOffAtFirst(globalThis.ft) },
  ),
);
