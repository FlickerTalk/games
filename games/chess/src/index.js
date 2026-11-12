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
  minBoard: 320,
});
