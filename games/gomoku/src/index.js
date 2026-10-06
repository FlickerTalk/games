// Five in a Row for FlickerTalk: the rules, the board and the texts, inside the games kit, which
// does the rest (the matches kept here, the other phone, the coin, the result in the chat).

import manifest from "../module.json";
import { defineGame } from "../../../kit/src/index.js";
import { board, STONES, STYLE } from "./board.js";
import { TEXTS } from "./texts.js";
import { initial, play, result, turn } from "./rules.js";

export const game = defineGame({
  id: "gomoku",
  gv: 1,
  tag: manifest.components[0],
  app: manifest.version,
  icon: "⚫",
  initial,
  turn,
  play,
  result,
  board,
  sides: STONES,
  style: STYLE,
  texts: TEXTS,
  // Fifteen intersections of about 21 px; a stone is placed in two taps, the second on a 44 px target.
  minBoard: 320,
  // A round won by the rules is won by a line of five.
  how: (ended, t) => (ended.line ? t("five") : ""),
});
