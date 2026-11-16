import manifest from "../module.json";
import { defineGame } from "../../../kit/src/index.js";
import { withSound } from "../../../kit/src/sound/index.js";
import { withPortraits } from "../../../kit/src/avatars/portraits.js";
import { board, STONES, STYLE } from "./board.js";
import { TEXTS } from "./texts.js";
import { initial, play, result, turn } from "./rules.js";
import { robot } from "./robot.js";

export const game = defineGame(
  withSound(
    {
      id: "gomoku",
      gv: 1,
      tag: manifest.components[0],
      app: manifest.version,
      icon: "⚫",
      initial,
      turn,
      play,
      result,
      robot,
      board: withPortraits(board),
      sides: STONES,
      style: STYLE,
      texts: TEXTS,
      minBoard: 320,
      how: (ended, t) => (ended.line ? t("five") : ""),
    },
    { tune: "calm" },
  ),
);
