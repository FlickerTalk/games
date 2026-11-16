import { defaultPlayer, loadPlayer, pickLayout, pickPress } from "../../../kit/src/avatars/index.js";
import { playMode } from "../../../kit/src/canvas/flick.js";
import { foldWhenIdle, soundState } from "../../../kit/src/canvas/input.js";
import { endLayout, homeLayout, looksLayout, pauseLayout, promptLayout } from "../../../kit/src/canvas/menu-layout.js";
import { isChat } from "../../../kit/src/store.js";
import { Duel } from "./duel.js";
import { HOME_TILES, TABS, albumLayout, playLayout, playTargets } from "./layout.js";
import { LOOKS, PROGRESS } from "./levels.js";
import { act, choosePlayer, menuPointer, renamePlayer } from "./menus.js";
import { finishDue, keepRound, roundKey, stepPlay } from "./rounds.js";
import { playPointer } from "./touch.js";

const OWN_KEY = "littlepier";
const KINDS = 24;

export function readOwn(raw) {
  try {
    const kept = JSON.parse(raw ?? "null");
    const album = Array.isArray(kept?.album) ? [...new Set(kept.album.filter((kind) => Number.isInteger(kind) && kind >= 0 && kind < KINDS))].sort((one, two) => one - two) : [];
    const rounds = Number.isInteger(kept?.rounds) && kept.rounds >= 0 ? kept.rounds : 0;
    return { taught: kept?.taught === true, album, rounds };
  } catch {
    return { taught: false, album: [], rounds: 0 };
  }
}

function freshState() {
  return {
    screen: "home", mode: "alone", lang: "en", chat: null, taught: false, album: [], rounds: 0, day: "morning",
    width: 0, height: 0, fill: false, layout: null, player: defaultPlayer(), progress: PROGRESS.fresh(),
    round: null, setup: null, flick: null, flickHolding: false, holding: false, finger: null, cast: 0, frameAt: null,
    moments: [], hint: false, paused: false, outcome: null, snapshot: null, resume: null, endAt: null,
    sound: { level: "high", music: true, open: false, volume: 1 }, pick: null, looks: "charm", press: null, volumeAt: 0,
  };
}

function mergeFriend(game) {
  const { state, duel } = game;
  if (!duel) return;
  const found = new Set(state.album);
  for (let index = 0; index < duel.nextIndex(); index += 1) for (const kind of duel.results(index).theirs?.kinds ?? []) found.add(kind);
  if (found.size === state.album.length) return;
  state.album = [...found].sort((one, two) => one - two);
  game.saveOwn();
}

async function opened(game, opening) {
  const { state } = game;
  state.lang = opening.lang || "en";
  state.chat = isChat(opening.chat) ? opening.chat : null;
  state.mode = playMode(opening, state.chat);
  state.player = (await loadPlayer(game.store)) ?? defaultPlayer();
  state.progress = await PROGRESS.load(game.store);
  Object.assign(state, readOwn(await game.store?.get(OWN_KEY)));
  try {
    state.resume = JSON.parse((await game.store?.get(roundKey(state))) ?? "null");
  } catch {
    state.resume = null;
  }
  if (state.mode === "friend") {
    game.duel = new Duel({ ft: game.ft, opening: { ...opening, chat: state.chat }, app: game.app, onChange: () => (mergeFriend(game), game.onChange()) });
    await game.duel.ready();
    mergeFriend(game);
  }
  game.syncSound();
}

export function createGame({ ft, sound, controls, app = "1.0.0", now = () => performance.now(), random = Math.random, onAsk = () => {}, onChange = () => {} }) {
  const state = freshState();
  const game = { ft, store: ft.store, sound, controls, app, now, random, onAsk, onChange, state, duel: null, pending: Promise.resolve() };
  game.run = (task) => {
    game.pending = game.pending.then(task).catch((error) => globalThis.console?.warn?.("little pier:", error?.message ?? error)).finally(() => game.onChange());
    return game.pending;
  };
  game.idle = () => game.pending;
  game.saveOwn = () => game.run(() => game.store?.set(OWN_KEY, JSON.stringify({ taught: state.taught, album: state.album, rounds: state.rounds })));
  game.saveProgress = () => game.run(() => PROGRESS.save(game.store, state.progress));
  game.syncSound = () => (state.sound = soundState(sound, controls));
  game.open = (opening = {}) => opened(game, opening);
  game.resize = (width, height, fill) => {
    Object.assign(state, { width, height, fill: Boolean(fill) });
    state.layout = playLayout(width, height, { fill: state.fill, rival: state.mode === "friend" });
  };
  game.targets = () => targetsOf(game);
  game.pointer = (event) => (state.screen === "play" ? playPointer(game, event) : menuPointer(game, event));
  game.frame = (time) => {
    if (foldWhenIdle(state, controls, time)) game.syncSound();
    state.moments = state.moments.filter((moment) => time < moment.start + moment.duration);
    stepPlay(game, time);
    if (state.endAt !== null && time >= state.endAt) finishDue(game);
  };
  game.rename = (text) => renamePlayer(game, text);
  game.press = (target) => pressed(game, target);
  game.resting = () => state.paused;
  game.close = () => {
    if (state.screen === "play") keepRound(game);
    return game.duel?.leave();
  };
  return game;
}

function pressed(game, target) {
  const { state } = game;
  if (state.screen !== "avatar") return target.kind === "volume" ? undefined : act(game, target);
  const { state: pick, ask } = pickPress(state.pick, target);
  state.pick = pick;
  if (ask === "rename") game.onAsk("rename");
  if (ask === "done") choosePlayer(game, pick.choice);
  return undefined;
}

function withVolume(game, targets) {
  const { state } = game;
  return state.sound.open && state.layout ? [{ kind: "volume", value: "volume", ...state.layout.volume }, ...targets] : targets;
}

function targetsOf(game) {
  const { state } = game;
  const { width, height, fill } = state;
  if (!width || !height) return [];
  if (game.duel?.status.prompt && ["home", "end"].includes(state.screen)) return promptLayout(width, height, { fill }).targets;
  if (state.screen === "play") return state.paused ? pauseLayout(width, height, { fill }).targets : playTargets(state.layout, { volume: state.sound.open });
  if (state.screen === "home") return withVolume(game, homeLayout(width, height, { variants: HOME_TILES, rival: state.mode !== "alone", fill }).targets);
  if (state.screen === "end") return withVolume(game, endLayout(width, height, { gift: Boolean(state.outcome?.gift && !state.outcome.opened), fill }).targets);
  if (state.screen === "album") return withVolume(game, albumLayout(width, height, { fill }).targets);
  if (state.screen === "looks") return looksLayout(width, height, { kind: state.looks, count: LOOKS[state.looks].length, fill, tabs: [...TABS] }).targets;
  if (state.screen === "avatar" && state.pick) return pickLayout(state.pick, width, height, state.lang).targets.filter((one) => one.visible);
  return [];
}

