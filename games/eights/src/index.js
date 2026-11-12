import manifest from "../module.json";
import { defineGame } from "../../../kit/src/index.js";
import { board, MARKS, STYLE } from "./board.js";
import { TEXTS } from "./texts.js";
import { initial, play, result, turn } from "./rules.js";

export const game = defineGame({
  id: "eights",
  gv: 1,
  tag: manifest.components[0],
  app: manifest.version,
  icon: "🃏",
  initial,
  turn,
  play,
  result,
  board,
  sides: MARKS,
  style: STYLE,
  texts: TEXTS,
  minBoard: 300,
  how: (ended, t) => t(ended.reason === "out" ? "wentOut" : ended.reason === "stuck" ? "stuck" : "deckCheat"),
});
