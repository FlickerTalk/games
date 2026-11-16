import manifest from "../module.json";
import { defineGame } from "../../../kit/src/index.js";
import { withSound } from "../../../kit/src/sound/index.js";
import { withPortraits } from "../../../kit/src/avatars/portraits.js";
import { board, MARKS, STYLE } from "./board.js";
import { TEXTS } from "./texts.js";
import { initial, play, result, turn } from "./rules.js";
import { robot } from "./robot.js";
import { BACKGAMMON_CUES, BACKGAMMON_EFFECTS, musicOffAtFirst } from "./sound.js";

export const game = defineGame(
  withSound(
    {
      id: "backgammon",
      gv: 1,
      tag: manifest.components[0],
      app: manifest.version,
      icon: "🎲",
      initial,
      turn,
      play,
      result,
      robot,
      board: withPortraits(board),
      sides: MARKS,
      style: STYLE,
      texts: TEXTS,
      minBoard: 320,
      how: (ended, t) => t({ single: "single", gammon: "gammon", backgammon: "backgammonWin", cheat: "diceCheat" }[ended.reason] ?? "single"),
    },
    { tune: "calm", cues: BACKGAMMON_CUES, effects: BACKGAMMON_EFFECTS },
    { ft: musicOffAtFirst(globalThis.ft) },
  ),
);
