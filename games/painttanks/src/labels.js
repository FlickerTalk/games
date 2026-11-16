import { SOUND_TEXTS } from "../../../kit/src/sound/index.js";
import { LOOKS, PROGRESS } from "./levels.js";
import { TEXTS } from "./texts.js";

const SOUND = { speaker: "sound", music: "music", volume: "volume" };
const KINDS = Object.keys(LOOKS);
const LOOK_TEXT = { tank: "lookTank", ship: "lookShip", sub: "lookSub", ball: "lookBall" };

function pick(catalogue, lang, key) {
  const tag = String(lang || "en");
  return catalogue[tag]?.[key] ?? catalogue[tag.split("-")[0]]?.[key] ?? catalogue.en[key];
}

export function say(lang, key, vars = {}) {
  const text = pick(TEXTS, lang, key) ?? key;
  return text.replace(/\{(\w+)\}/g, (gap, name) => (name in vars ? new Intl.NumberFormat(lang || "en").format(vars[name]) : gap));
}

function lookLabel(target, state) {
  const { lang, looks } = state;
  if (!looks) return say(lang, KINDS[target.value] ?? "looks");
  const look = LOOKS[looks]?.[target.value];
  if (!PROGRESS.owned(state.progress).includes(look)) return say(lang, "wrapped");
  return say(lang, LOOK_TEXT[looks], { n: target.value + 1 });
}

function rivalLabel(state) {
  const other = state.mode === "flick" ? "Flick" : "Friend";
  return say(state.lang, `${state.practice ? "practice" : "rival"}${other}`);
}

export function labelFor(target, state) {
  const { lang } = state;
  if (target.label) return target.label;
  if (SOUND[target.kind]) return pick(SOUND_TEXTS, lang, SOUND[target.kind]);
  if (target.kind === "variant") return say(lang, target.value);
  if (target.kind === "look") return lookLabel(target, state);
  if (target.kind === "rival") return rivalLabel(state);
  if (target.kind === "angle" || target.kind === "power") return say(lang, target.kind, { n: state.round?.aim[target.kind] ?? 0 });
  if (target.kind === "dive") return say(lang, state.round?.torpedo ? "surface" : "dive");
  return say(lang, target.kind);
}
