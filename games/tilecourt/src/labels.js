import { SOUND_TEXTS } from "../../../kit/src/sound/index.js";
import { TEXTS } from "./texts.js";

function pick(catalogue, lang, key) {
  const tag = String(lang || "en");
  return catalogue[tag]?.[key] ?? catalogue[tag.split("-")[0]]?.[key] ?? catalogue.en[key];
}

export function say(lang, key, vars = {}) {
  const text = pick(TEXTS, lang, key) ?? key;
  return text.replace(/\{(\w+)\}/g, (gap, name) => (name in vars ? new Intl.NumberFormat(lang || "en").format(vars[name]) : gap));
}

const SOUND = { speaker: "sound", music: "music", volume: "volume" };

export function labelFor(target, state) {
  const { lang } = state;
  if (target.label) return target.label;
  if (SOUND[target.kind]) return pick(SOUND_TEXTS, lang, SOUND[target.kind]);
  if (target.kind === "slot") return say(lang, "piece", { n: target.value + 1 });
  if (target.kind === "variant") return say(lang, target.value);
  if (target.kind === "look") return say(lang, state.looks === "effect" ? "effect" : "court", { n: target.value + 1 });
  if (target.kind === "tab") return say(lang, target.value === "effect" ? "tabEffect" : "tabCourt");
  if (target.kind === "rival") return say(lang, state.mode === "flick" ? "flick" : "call");
  return say(lang, target.kind);
}
