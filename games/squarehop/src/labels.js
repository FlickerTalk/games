import { SOUND_TEXTS } from "../../../kit/src/sound/index.js";
import { TEXTS } from "./texts.js";

const SOUND = { speaker: "sound", music: "music", volume: "volume" };
const KEYS = {
  variant: (target) => (target.value === "pair" ? "pair" : "vsFlick"),
  tab: (target) => (target.value === "dice" ? "tabDice" : "tabTrack"),
  rival: (target, state, status) => (state.mode === "flick" ? "flick" : status?.invited ? "invited" : "call"),
};

function pick(catalogue, lang, key) {
  const tag = String(lang || "en");
  return catalogue[tag]?.[key] ?? catalogue[tag.split("-")[0]]?.[key] ?? catalogue.en[key];
}

export function say(lang, key, vars = {}) {
  const text = pick(TEXTS, lang, key) ?? key;
  return text.replace(/\{(\w+)\}/g, (gap, name) => (name in vars ? new Intl.NumberFormat(lang || "en").format(vars[name]) : gap));
}

export function labelFor(target, state, status = null) {
  const { lang } = state;
  if (target.label) return target.label;
  if (SOUND[target.kind]) return pick(SOUND_TEXTS, lang, SOUND[target.kind]);
  if (target.kind === "die") return say(lang, "die", { n: state.round?.dice?.[target.value] ?? target.value + 1 });
  if (target.kind === "look") return say(lang, state.looks === "dice" ? "diceLook" : "trackLook", { n: target.value + 1 });
  return say(lang, KEYS[target.kind]?.(target, state, status) ?? target.kind);
}
