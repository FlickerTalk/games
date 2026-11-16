import { SOUND_TEXTS } from "../../../kit/src/sound/index.js";
import { ringState } from "./program.js";
import { TEXTS } from "./texts.js";

const SOUND = { speaker: "sound", music: "music", volume: "volume" };
const COMMANDS = { F: "forward", L: "left", R: "right", U: "use" };
const CELLS = { "#": "wall", "~": "puddle", B: "battery", D: "door", G: "goal" };
const SEND = { flick: "sendFlick", friend: "send", alone: "sendAlone" };

function pick(catalogue, lang, key) {
  const tag = String(lang || "en");
  return catalogue[tag]?.[key] ?? catalogue[tag.split("-")[0]]?.[key] ?? catalogue.en[key];
}

export function say(lang, key, vars = {}) {
  const text = pick(TEXTS, lang, key) ?? key;
  return text.replace(/\{(\w+)\}/g, (gap, name) => (name in vars ? new Intl.NumberFormat(lang || "en").format(vars[name]) : gap));
}

function ringLabel(state) {
  const edit = state.round?.edit;
  const now = edit ? ringState(edit) : "none";
  if (now === "open") return "repeatClose";
  if (now === "empty") return edit.items.at(-1).times === 2 ? "repeatThree" : "repeatOff";
  return "repeatTwo";
}

function cellLabel({ value }, state) {
  const base = say(state.lang, "cell", { n: value + 1 });
  const level = state.build?.level;
  if (!level) return base;
  const kind = level.start.at === value ? "robot" : CELLS[level.cells[value]];
  return kind ? `${base}: ${say(state.lang, kind)}` : base;
}

const KEYS = {
  play: (target, state) => (state.screen !== "play" ? "play" : state.round?.run ? "stop" : "run"),
  variant: (target) => target.value,
  command: (target) => COMMANDS[target.value],
  ring: (target, state) => ringLabel(state),
  tool: (target) => target.value,
  send: (target, state) => SEND[state.mode] ?? "sendAlone",
  tab: (target) => (target.value === "world" ? "tabWorld" : "tabRobot"),
  rival: (target, state) => (state.mode === "flick" ? "flick" : "call"),
};

export function labelFor(target, state) {
  const { lang } = state;
  if (target.label) return target.label;
  if (SOUND[target.kind]) return pick(SOUND_TEXTS, lang, SOUND[target.kind]);
  if (target.kind === "cell") return cellLabel(target, state);
  if (target.kind === "look") return say(lang, state.looks === "world" ? "worldLook" : "robotLook", { n: target.value + 1 });
  const key = KEYS[target.kind]?.(target, state) ?? target.kind;
  return say(lang, key);
}
