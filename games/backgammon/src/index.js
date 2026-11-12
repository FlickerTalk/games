import manifest from "../module.json";
import { defineGame } from "../../../kit/src/index.js";
import { board, MARKS, STYLE } from "./board.js";
import { TEXTS } from "./texts.js";
import { initial, play, result, turn } from "./rules.js";

export const game = defineGame({
  id: "backgammon",
  gv: 1,
  tag: manifest.components[0],
  app: manifest.version,
  icon: "🎲",
  initial,
  turn,
  play,
  result,
  board,
  sides: MARKS,
  style: STYLE,
  texts: TEXTS,
  minBoard: 320,
  how: (ended, t) => t({ single: "single", gammon: "gammon", backgammon: "backgammonWin", cheat: "diceCheat" }[ended.reason] ?? "single"),
});
