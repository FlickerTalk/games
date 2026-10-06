// Crazy Eights for FlickerTalk: the rules, the table and the texts, inside the games kit, which
// does the rest (the matches kept here, the other phone, the coin, the result in the chat). The
// deck is shuffled by both phones together, with the game's own SHA-256.

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
  // Cards of 52 × 74 px, a hand of seven in two rows at most, the table between.
  minBoard: 300,
  how: (ended, t) => t(ended.reason === "out" ? "wentOut" : ended.reason === "stuck" ? "stuck" : "deckCheat"),
});
