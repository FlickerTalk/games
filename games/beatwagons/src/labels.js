import { SOUND_TEXTS } from "../../../kit/src/sound/index.js";
import { TEXTS } from "./texts.js";
import { beatsOf, kindOf, wagonOf } from "./train.js";
import { INSTRUMENTS } from "./tune.js";

const SOUND = { speaker: "sound", music: "music", volume: "volume" };
const SEND = { flick: "sendFlick", friend: "send", alone: "sendAlone" };

function pick(catalogue, lang, key) {
  const tag = String(lang || "en");
  return catalogue[tag]?.[key] ?? catalogue[tag.split("-")[0]]?.[key] ?? catalogue.en[key];
}

export function say(lang, key, vars = {}) {
  const text = pick(TEXTS, lang, key) ?? key;
  const shown = (value) => (typeof value === "number" ? new Intl.NumberFormat(lang || "en").format(value) : String(value));
  return text.replace(/\{(\w+)\}/g, (gap, name) => (name in vars ? shown(vars[name]) : gap));
}

export function wagonName(lang, wagon) {
  const name = say(lang, INSTRUMENTS[kindOf(wagon)]);
  return beatsOf(wagon) > 1 ? say(lang, "wagonBeats", { wagon: name, n: beatsOf(wagon) }) : name;
}

const KEYS = {
  variant: (target) => target.value,
  send: (target, state) => SEND[state.mode] ?? "sendAlone",
  tab: (target) => (target.value === "scenery" ? "tabScenery" : "tabEngine"),
  rival: (target, state) => (state.mode === "flick" ? "flick" : "call"),
};

export function labelFor(target, state) {
  const { lang } = state;
  if (target.label) return target.label;
  if (SOUND[target.kind]) return pick(SOUND_TEXTS, lang, SOUND[target.kind]);
  if (target.kind === "candidate") return wagonName(lang, state.round?.candidates[target.value] ?? 0);
  if (target.kind === "wagon") return wagonName(lang, wagonOf(target.value, state.build?.beats ?? 1));
  if (target.kind === "dots") return say(lang, "dots", { n: state.build?.beats ?? 1 });
  if (target.kind === "slot") return say(lang, state.build?.hidden[target.value] ? "slotHidden" : "slot", { n: target.value + 1 });
  if (target.kind === "look") return say(lang, state.looks === "scenery" ? "sceneryLook" : "engineLook", { n: target.value + 1 });
  return say(lang, KEYS[target.kind]?.(target, state) ?? target.kind);
}
