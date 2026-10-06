// Checkers for FlickerTalk: the rules, the board and the texts, inside the games kit, which does
// the rest (the matches kept here, the other phone, the coin, the result in the chat).

import manifest from "../module.json";
import { defineGame } from "../../../kit/src/index.js";
import { board, PIECES, STYLE } from "./board.js";
import { TEXTS } from "./texts.js";
import { initial, play, result, turn } from "./rules.js";

export const game = defineGame({
  id: "checkers",
  gv: 1,
  tag: manifest.components[0],
  app: manifest.version,
  icon: "🔘",
  initial,
  turn,
  play,
  result,
  board,
  sides: PIECES,
  style: STYLE,
  texts: TEXTS,
  // Eight squares of at least 40 px in a game, as the chess board.
  minBoard: 320,
  // Why the round ended, and the count of pieces.
  how: (ended, t) => `${t(ended.how === "quiet" ? "quiet" : ended.how === "captured" ? "captured" : "noMoves")} · ${t("count", { dark: ended.dark, light: ended.light })}`,
});
