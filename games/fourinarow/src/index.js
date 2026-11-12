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
  minBoard: 308,
});
