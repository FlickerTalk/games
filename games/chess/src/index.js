// Chess for FlickerTalk: the rules (chess.js), the board (cm-chessboard with the Chessnut pieces),
// the texts and the result for the chat, inside the games kit, which does the rest (the matches
// kept here, the other phone, the coin that says who plays white, resigning, the series).

import manifest from "../module.json";
import { defineGame } from "../../../kit/src/index.js";
import { SIDES, STYLE, board } from "./board.js";
import { initial, play, result, turn } from "./rules.js";
import { how, summary } from "./summary.js";
import { TEXTS } from "./texts.js";

export const game = defineGame({
  id: "chess",
  gv: 1,
  tag: manifest.components[0],
  app: manifest.version,
  icon: "♟️",
  initial,
  turn,
  play,
  result,
  board,
  sides: SIDES,
  style: STYLE,
  texts: TEXTS,
  summary,
  how,
  // Eight squares of at least 40 px in a game: the kit makes room for that before anything else.
  minBoard: 320,
});
