// Word Duel for FlickerTalk: the rules, the board and the texts, inside the games kit, which does
// the rest (the matches kept here, the other phone, the coin, the result in the chat). Each side's
// secret word is committed to with the game's own SHA-256 and checked when both are revealed.

import manifest from "../module.json";
import { defineGame } from "../../../kit/src/index.js";
import { board, MARKS, STYLE } from "./board.js";
import { TEXTS } from "./texts.js";
import { initial, play, result, turn } from "./rules.js";

export const game = defineGame({
  id: "wordduel",
  gv: 1,
  tag: manifest.components[0],
  app: manifest.version,
  icon: "🔤",
  initial,
  turn,
  play,
  result,
  board,
  sides: MARKS,
  style: STYLE,
  texts: TEXTS,
  // Six rows of five tiles beside the other side's, and a field with the phone's own keyboard.
  minBoard: 300,
  how: (ended, t) => t({ solved: "solvedIn", nobody: "nobody", tie: "tie", cheat: "dishonest", both: "bothDishonest" }[ended.reason] ?? "nobody"),
});
