import { lobbyOf } from "../../../kit/src/duel/lobby.js";
import { SOUND_TEXTS } from "../../../kit/src/sound/index.js";
import { formatNumber } from "../../../kit/src/canvas/index.js";
import { HULLS, PAGE, PROGRESS } from "./levels.js";
import { TEXTS } from "./texts.js";

function pick(catalogue, lang, key) {
  const tag = String(lang || "en");
  return catalogue[tag]?.[key] ?? catalogue[tag.split("-")[0]]?.[key] ?? catalogue.en[key];
}

export const say = (lang, key) => pick(TEXTS, lang, key) ?? key;

const SOUND = { speaker: "sound", music: "music", volume: "volume" };

function seatKey(state, status) {
  if (state.mode !== "friend") return "flick";
  if (!status) return "call";
  if (status.update) return "update";
  if (status.away) return "away";
  if (status.calling) return "waiting";
  if (status.here) return status.ready?.them ? "ready" : "here";
  return "call";
}

function lookLabel(state, value) {
  const index = (state.page ?? 0) * PAGE + value;
  const look = HULLS[state.world][index];
  if (!look || !PROGRESS.owned(state.progress).includes(look)) return say(state.lang, "wrapped");
  return say(state.lang, "craft").replace("{n}", formatNumber(index + 1, state.lang));
}

export function labelFor(target, state, status = null) {
  const { lang } = state;
  if (target.label) return target.label;
  if (SOUND[target.kind]) return pick(SOUND_TEXTS, lang, SOUND[target.kind]);
  if (target.kind === "variant") return say(lang, target.value);
  if (target.kind === "look") return lookLabel(state, target.value);
  if (target.kind === "tab") return `${say(lang, "looks")} ${formatNumber(target.value + 1, lang)}`;
  if (target.kind === "rival") return say(lang, seatKey(state, status));
  if (target.kind === "play" && lobbyOf(status).waiting) return say(lang, "waiting");
  return say(lang, target.kind);
}
