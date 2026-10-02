// Four in a Row for FlickerTalk: the rules, the board and the texts, inside the games kit, which
// does the rest (the matches kept here, the other phone, the coin, the result in the chat).

import manifest from "../module.json";
import { defineGame } from "../../../kit/src/index.js";
import { board, DISCS, STYLE } from "./board.js";
import { TEXTS } from "./texts.js";
import { initial, play, result, turn } from "./rules.js";

export const game = defineGame({
  id: "fourinarow",
  gv: 1,
  tag: manifest.components[0],
  app: manifest.version,
  icon: "🔴",
  initial,
  turn,
  play,
  result,
  board,
  sides: DISCS,
  style: STYLE,
  texts: TEXTS,
  // Seven columns of at least 44 px in a game: the kit makes room for that before anything else.
  minBoard: 308,
});
