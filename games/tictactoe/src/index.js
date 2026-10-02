// Tic-Tac-Toe for FlickerTalk: the rules, the board and the texts, inside the games kit, which
// does the rest (the matches kept here, the other phone, the coin, the result in the chat).

import manifest from "../module.json";
import { defineGame } from "../../../kit/src/index.js";
import { board, MARKS, STYLE } from "./board.js";
import { TEXTS } from "./texts.js";
import { initial, play, result, turn } from "./rules.js";

export const game = defineGame({
  id: "tictactoe",
  gv: 1,
  tag: manifest.components[0],
  app: manifest.version,
  icon: "⭕",
  initial,
  turn,
  play,
  result,
  board,
  sides: MARKS,
  style: STYLE,
  texts: TEXTS,
});
