import { SOUND_TEXTS } from "../../../kit/src/sound/index.js";
import { golemOf, turnOf } from "./round.js";
import { TEXTS } from "./texts.js";

const SOUND = { speaker: "sound", music: "music", volume: "volume" };

function pick(catalogue, lang, key) {
  const tag = String(lang || "en");
  return catalogue[tag]?.[key] ?? catalogue[tag.split("-")[0]]?.[key] ?? catalogue.en[key];
}

export function say(lang, key, vars = {}) {
  const text = pick(TEXTS, lang, key) ?? key;
  return text.replace(/\{(\w+)\}/g, (gap, name) => (name in vars ? new Intl.NumberFormat(lang || "en").format(vars[name]) : gap));
}

function hitLabel({ value }, { lang, round }) {
  if (!round || round.core.over) return say(lang, "hitIdle", { n: value });
  if (golemOf(round.core).cap === value) return say(lang, "hitCapped", { n: value });
  if (turnOf(round.core) !== round.mySide) return say(lang, "hitWait", { n: value });
  return say(lang, "hit", { n: value, v: round.core.value });
}

const KEYS = {
  tab: (target) => (target.value === "place" ? "tabPlace" : "tabMallet"),
  rival: (target, state) => (state.mode === "flick" ? "flick" : "call"),
};

export function labelFor(target, state) {
  const { lang } = state;
  if (target.label) return target.label;
  if (SOUND[target.kind]) return pick(SOUND_TEXTS, lang, SOUND[target.kind]);
  if (target.kind === "hit") return hitLabel(target, state);
  if (target.kind === "look") return say(lang, state.looks === "place" ? "placeLook" : "malletLook", { n: target.value + 1 });
  return say(lang, KEYS[target.kind]?.(target, state) ?? target.kind);
}
