// Sea Battle for FlickerTalk: the rules, the board and the texts, inside the games kit, which does
// the rest (the matches kept here, the other phone, the coin, the result in the chat). The hidden
// fleets are committed to with the game's own SHA-256 and checked when both are revealed.

import manifest from "../module.json";
import { defineGame } from "../../../kit/src/index.js";
import { board, MARKS, STYLE } from "./board.js";
import { TEXTS } from "./texts.js";
import { initial, play, result, turn } from "./rules.js";

export const game = defineGame({
  id: "seabattle",
  gv: 1,
  tag: manifest.components[0],
  app: manifest.version,
  icon: "🚢",
  initial,
  turn,
  play,
  result,
  board,
  sides: MARKS,
  style: STYLE,
  texts: TEXTS,
  // The other side's sea takes about 70 % of the board: ten cells of 22 px, fired at in two taps.
  minBoard: 320,
  how: (ended, t) => t(ended.reason === "sunk" ? "allSunk" : ended.reason === "cheat" ? "dishonest" : "bothDishonest"),
});
