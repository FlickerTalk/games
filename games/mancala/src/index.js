import manifest from "../module.json";
import { defineGame } from "../../../kit/src/index.js";
import { board, SEED_MARKS, STYLE } from "./board.js";
import { TEXTS } from "./texts.js";
import { initial, play, result, turn } from "./rules.js";

export const game = defineGame({
  id: "mancala",
  gv: 1,
  tag: manifest.components[0],
  app: manifest.version,
  icon: "🫘",
  initial,
  turn,
  play,
  result,
  board,
  sides: SEED_MARKS,
  style: STYLE,
  texts: TEXTS,
  minBoard: 352,
  how: (ended, t) => t("count", { first: ended.first, second: ended.second }),
});
