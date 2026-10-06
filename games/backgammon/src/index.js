// Backgammon for FlickerTalk: the rules, the board and the texts, inside the games kit, which does
// the rest (the matches kept here, the other phone, the coin, the result in the chat). The dice are
// rolled by both phones together before each turn, with the game's own SHA-256.

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
  // Twelve points a row of about 22 px each; a checker moves in two taps, the second on a 44 px target.
  minBoard: 320,
  how: (ended, t) => t({ single: "single", gammon: "gammon", backgammon: "backgammonWin", cheat: "diceCheat" }[ended.reason] ?? "single"),
});
