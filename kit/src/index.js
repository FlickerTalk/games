// The games kit (README): what a game imports. `defineGame` registers the game's web component
// with the shell around its rules and its board; the rest is there for the game's own tests.

import { elementFor } from "./shell.js";

export { summarize, Table } from "./table.js";
export { replay, view } from "./match.js";
export { KIT_TEXTS, LANGUAGES, joinTexts, translator, direction } from "./i18n.js";
export { ICONS, icon } from "./icons.js";

const REQUIRED = {
  id: "string",
  gv: "number",
  tag: "string",
  app: "string",
  icon: "string",
  initial: "function",
  turn: "function",
  play: "function",
  result: "function",
  board: "object",
  texts: "object",
};

/** Registers a game (README, "A game"): its rules, its board and its texts inside the shell. */
export function defineGame(game) {
  for (const [field, kind] of Object.entries(REQUIRED)) {
    if (typeof game[field] !== kind || game[field] === null) throw new TypeError(`a game needs ${field} (${kind})`);
  }
  if (typeof game.board.mount !== "function") throw new TypeError("a game's board needs mount(host, context)");
  if (!customElements.get(game.tag)) customElements.define(game.tag, elementFor(game));
  return game;
}
