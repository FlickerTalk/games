import manifest from "../module.json";
import { withPortraits } from "../../../kit/src/avatars/portraits.js";
import { defineGame } from "../../../kit/src/index.js";
import { withSound } from "../../../kit/src/sound/index.js";
import { board, MARKS, STYLE } from "./board.js";
import { robot } from "./robot.js";
import { initial, play, result, turn } from "./rules.js";
import { CARD_CUES, CARD_EFFECTS, musicOffAtFirst } from "./sound.js";
import { TEXTS } from "./texts.js";
import { LIMIT } from "./war.js";

const HOW = { pairs: "morePairs", all: "tookAll", limit: "warLimit", out: "wentOut", stock: "stockOut", books: "allBooks", cheat: "deckCheat" };

export const game = defineGame(
  withSound(
    {
      id: "cardcorner",
      gv: 1,
      tag: manifest.components[0],
      app: manifest.version,
      icon: "🃏",
      initial,
      turn,
      play,
      result,
      robot,
      board: withPortraits(board),
      sides: MARKS,
      style: STYLE,
      texts: TEXTS,
      minBoard: 300,
      how: (ended, t) => t(HOW[ended.reason], { limit: LIMIT }),
    },
    { tune: "calm", cues: CARD_CUES, effects: CARD_EFFECTS },
    { ft: musicOffAtFirst(globalThis.ft) },
  ),
);
