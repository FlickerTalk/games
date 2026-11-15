import { liveElementFor } from "./arena.js";

export { Follow } from "./follow.js";
export { LIVE_TIMING, Session, verdict } from "./session.js";
export { LIVE_TEXTS } from "./texts.js";
export { formatTime } from "./page.js";

const REQUIRED = {
  id: "string",
  gv: "number",
  tag: "string",
  app: "string",
  aspect: "number",
  check: "function",
  stage: "object",
  texts: "object",
};

export function defineLiveGame(game) {
  for (const [field, kind] of Object.entries(REQUIRED)) {
    if (typeof game[field] !== kind || game[field] === null) throw new TypeError(`a real-time game needs ${field} (${kind})`);
  }
  if (typeof game.stage.mount !== "function") throw new TypeError("a real-time game's stage needs mount(hosts, context)");
  if (!customElements.get(game.tag)) customElements.define(game.tag, liveElementFor(game));
  return game;
}
