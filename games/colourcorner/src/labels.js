import { SOUND_TEXTS } from "../../../kit/src/sound/index.js";
import { PAINT_KEYS } from "./theme.js";
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

function tileLabel(target, state) {
  if (state.screen === "gallery") return say(state.lang, "picture", { n: target.value + 1 });
  return (state.owned ?? []).includes(target.value) ? say(state.lang, `page_${target.value}`) : say(state.lang, "wrapped");
}

export function labelFor(target, state) {
  const { lang } = state;
  if (target.label) return target.label;
  if (SOUND[target.kind]) return pick(SOUND_TEXTS, lang, SOUND[target.kind]);
  if (target.kind === "tile") return tileLabel(target, state);
  if (target.kind === "paint") return say(lang, `paint_${PAINT_KEYS[target.value]}`);
  if (target.kind === "pattern") return say(lang, `pattern_${target.value}`);
  if (target.kind === "tool") return say(lang, `tool_${target.value}`);
  if (target.kind === "zone") return say(lang, "zone", { n: target.value + 1 });
  if (target.kind === "variant") return say(lang, target.value);
  if (target.kind === "rival") return say(lang, state.mode === "flick" ? "flick" : "call");
  if (target.kind === "play" && state.screen === "picture") return say(lang, "another");
  return say(lang, target.kind);
}
