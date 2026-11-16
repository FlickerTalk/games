import { defaultPlayer, loadPlayer, pickLayout, pickPress, savePlayer } from "../../../kit/src/avatars/index.js";
import { playMode } from "../../../kit/src/canvas/flick.js";
import { foldWhenIdle, soundState } from "../../../kit/src/canvas/input.js";
import { endLayout, homeLayout, looksLayout, pauseLayout, promptLayout } from "../../../kit/src/canvas/menu-layout.js";
import { isChat } from "../../../kit/src/store.js";
import { endRound, teamNext } from "./flow.js";
import { layoutTargets, playLayout } from "./layout.js";
import { LOOKS, PROGRESS } from "./levels.js";
import { act, renamePlayer } from "./menus.js";
import { frameRound } from "./playing.js";
import { Relay } from "./relay.js";
import { keptRound, roundKey } from "./rounds.js";
import { pointerOf } from "./touch.js";

const OWN_KEY = "shardsplitter";
const LOOK_TABS = ["mallet", "place"];

async function readOwn(store) {
  try {
    return { taught: JSON.parse((await store?.get(OWN_KEY)) ?? "null")?.taught === true };
  } catch {
    return { taught: false };
  }
}

async function readRound(store, state) {
  try {
    const kept = keptRound(JSON.parse((await store?.get(roundKey(state))) ?? "null"));
    return kept && { kind: kept.kind, setup: kept.setup, hits: kept.hits };
  } catch {
    return null;
  }
}

function freshState() {
  return {
    screen: "home", mode: "alone", lang: "en", chat: null, taught: false, wanting: false,
    width: 0, height: 0, fill: false, layout: null, player: defaultPlayer(), progress: PROGRESS.fresh(),
    round: null, resume: null, moments: [], hint: null, paused: false, outcome: null, endAt: null,
    sound: { level: "high", music: true, open: false, volume: 1 }, pick: null, looks: "mallet", press: null, volumeAt: 0,
  };
}

export const hasMate = (state) => state.mode !== "alone";

function handsOf(state) {
  const { round } = state;
  if (!round) return { mine: [2, 5, 10], theirs: [] };
  const { hands } = round.core;
  return { mine: hands[round.mySide], theirs: hands[1 - round.mySide] ?? [] };
}

function withVolume(game, targets) {
  const { state } = game;
  return state.sound.open && state.layout ? [{ kind: "volume", value: "volume", ...state.layout.volume }, ...targets] : targets;
}

function targetsOf(game) {
  const { state } = game;
  const { width, height, fill, screen } = state;
  if (!width || !height) return [];
  if (game.relay?.status.prompt && ["home", "end"].includes(screen)) return promptLayout(width, height, { fill }).targets;
  if (screen === "play") return state.paused ? pauseLayout(width, height, { fill }).targets : layoutTargets(state.layout, { volume: state.sound.open });
  if (screen === "home") return withVolume(game, homeLayout(width, height, { variants: [], rival: hasMate(state), fill }).targets);
  if (screen === "end") return withVolume(game, endLayout(width, height, { gift: Boolean(state.outcome?.gift && !state.outcome.opened), fill }).targets);
  if (screen === "looks") return looksLayout(width, height, { kind: state.looks, count: LOOKS[state.looks].length, fill, tabs: LOOK_TABS }).targets;
  if (screen === "avatar" && state.pick) return pickLayout(state.pick, width, height, state.lang).targets.filter((one) => one.visible);
  return [];
}

function pressed(game, target) {
  const { state } = game;
  if (state.screen !== "avatar") return target.kind === "volume" ? undefined : act(game, target);
  const { state: pick, ask } = pickPress(state.pick, target);
  state.pick = pick;
  if (ask === "rename") game.onAsk("rename");
  if (ask === "done") {
    state.player = pick.choice;
    state.screen = "home";
    game.run(() => savePlayer(game.store, pick.choice));
  }
  return undefined;
}

async function opened(game, opening) {
  const { state } = game;
  state.lang = opening.lang || "en";
  state.chat = isChat(opening.chat) ? opening.chat : null;
  state.mode = playMode(opening, state.chat);
  state.player = (await loadPlayer(game.store)) ?? defaultPlayer();
  state.progress = await PROGRESS.load(game.store);
  Object.assign(state, await readOwn(game.store));
  state.resume = await readRound(game.store, state);
  if (state.mode === "friend") {
    const heard = () => {
      if (state.wanting) game.run(() => teamNext(game));
      else game.onChange();
    };
    game.relay = new Relay({ ft: game.ft, opening: { ...opening, chat: state.chat }, app: game.app, onChange: heard });
    await game.relay.ready();
  }
  game.syncSound();
}

export function createGame({ ft, sound, controls, app = "1.0.0", now = () => performance.now(), random = Math.random, onAsk = () => {}, onChange = () => {} }) {
  const state = freshState();
  const game = { ft, store: ft.store, sound, controls, app, now, random, onAsk, onChange, state, relay: null, teaming: false, pending: Promise.resolve() };
  game.run = (task) => {
    game.pending = game.pending.then(task).catch((error) => globalThis.console?.warn?.("shard splitter:", error?.message ?? error)).finally(() => game.onChange());
    return game.pending;
  };
  game.idle = () => game.pending;
  game.saveOwn = () => game.run(() => game.store?.set(OWN_KEY, JSON.stringify({ taught: state.taught })));
  game.saveProgress = () => game.run(() => PROGRESS.save(game.store, state.progress));
  game.syncSound = () => (state.sound = soundState(sound, controls));
  game.open = (opening = {}) => opened(game, opening);
  game.resize = (width, height, fill) => {
    Object.assign(state, { width, height, fill: Boolean(fill) });
    state.layout = playLayout(width, height, { ...handsOf(state), fill: state.fill, rival: hasMate(state) });
  };
  game.targets = () => targetsOf(game);
  game.pointer = (event) => pointerOf(game, event);
  game.frame = (time) => {
    if (foldWhenIdle(state, controls, time)) game.syncSound();
    state.moments = state.moments.filter((moment) => time < moment.start + moment.duration);
    if (state.screen === "play" && !state.paused) frameRound(game, time);
    if (state.endAt !== null && time >= state.endAt) {
      state.endAt = null;
      game.run(() => endRound(game));
    }
  };
  game.rename = (text) => renamePlayer(game, text);
  game.press = (target) => pressed(game, target);
  game.resting = () => state.paused;
  game.close = () => game.relay?.leave();
  return game;
}
