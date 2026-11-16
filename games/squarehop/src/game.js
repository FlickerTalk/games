import { defaultPlayer, loadPlayer, pickLayout, pickPress, savePlayer } from "../../../kit/src/avatars/index.js";
import { endLayout, foldWhenIdle, homeLayout, looksLayout, pauseLayout, playMode, promptLayout, soundState } from "../../../kit/src/canvas/index.js";
import { isChat } from "../../../kit/src/store.js";
import { Duel } from "./duel.js";
import { endRound, frameRound, mayPick, roundKey } from "./flow.js";
import { layoutTargets, playLayout } from "./layout.js";
import { LOOKS, PROGRESS } from "./levels.js";
import { act, renamePlayer } from "./menus.js";
import { keptRound } from "./round.js";
import { pointerOf } from "./touch.js";

export const VARIANTS = Object.freeze(["flick", "pair"]);
export const LOOK_TABS = Object.freeze(["track", "dice"]);
const OWN_KEY = "squarehop";

async function readOwn(store) {
  try {
    const kept = JSON.parse((await store?.get(OWN_KEY)) ?? "null");
    return { variant: VARIANTS.includes(kept?.variant) ? kept.variant : "flick", taught: kept?.taught === true };
  } catch {
    return { variant: "flick", taught: false };
  }
}

async function readRound(store, state, now) {
  try {
    return keptRound(JSON.parse((await store?.get(roundKey(state))) ?? "null"), now);
  } catch {
    return null;
  }
}

function freshState() {
  return {
    screen: "home", mode: "alone", lang: "en", chat: null, variant: "flick", taught: false, skill: 0.5,
    width: 0, height: 0, fill: false, layout: null, player: defaultPlayer(), progress: PROGRESS.fresh(),
    round: null, resume: null, moments: [], hint: false, paused: false, outcome: null, endAt: null, flickAt: null,
    sound: { level: "high", music: true, open: false, volume: 1 }, pick: null, looks: "track", press: null, volumeAt: 0,
  };
}

export const variantsOf = (state) => (state.mode === "alone" ? VARIANTS : []);

function withVolume(game, targets) {
  const { state } = game;
  return state.sound.open && state.layout ? [{ kind: "volume", value: "volume", ...state.layout.volume }, ...targets] : targets;
}

function targetsOf(game) {
  const { state } = game;
  const { width, height, fill, screen } = state;
  if (game.duel?.status.prompt && ["home", "end"].includes(screen)) return promptLayout(width, height, { fill }).targets;
  if (screen === "play" && state.paused) return pauseLayout(width, height, { fill }).targets;
  if (screen === "play") return state.layout ? layoutTargets(state.layout, { volume: state.sound.open, dice: mayPick(game, game.now()) }) : [];
  if (screen === "home") return withVolume(game, homeLayout(width, height, { variants: variantsOf(state), rival: state.mode !== "alone", fill }).targets);
  if (screen === "end") return withVolume(game, endLayout(width, height, { gift: Boolean(state.outcome?.gift && !state.outcome.opened), fill }).targets);
  if (screen === "looks") return looksLayout(width, height, { kind: state.looks, count: LOOKS[state.looks].length, fill, tabs: LOOK_TABS }).targets;
  if (screen === "avatar" && state.pick) return pickLayout(state.pick, width, height, state.lang).targets.filter((one) => one.visible);
  return [];
}

export function createGame({ ft, sound, controls, app = "1.0.0", now = () => performance.now(), random = Math.random, onAsk = () => {}, onChange = () => {}, timing }) {
  const state = freshState();
  const game = { ft, store: ft.store, sound, controls, now, random, onAsk, onChange, state, duel: null, pending: Promise.resolve() };

  game.run = (task) => {
    game.pending = game.pending.then(task).catch((error) => globalThis.console?.warn?.("square hop rally:", error?.message ?? error)).finally(() => game.onChange());
    return game.pending;
  };
  game.idle = () => game.pending;
  game.saveOwn = () => game.run(() => game.store?.set(OWN_KEY, JSON.stringify({ variant: state.variant, taught: state.taught })));
  game.saveProgress = () => game.run(() => PROGRESS.save(game.store, state.progress));
  game.syncSound = () => {
    state.sound = soundState(sound, controls);
  };

  game.open = async (opening = {}) => {
    state.lang = opening.lang || "en";
    state.chat = isChat(opening.chat) ? opening.chat : null;
    state.mode = playMode(opening, state.chat);
    state.player = (await loadPlayer(game.store)) ?? defaultPlayer();
    state.progress = await PROGRESS.load(game.store);
    Object.assign(state, await readOwn(game.store));
    state.resume = await readRound(game.store, state, game.now());
    if (state.mode === "friend") {
      game.duel = new Duel({ ft, opening: { ...opening, chat: state.chat }, app, timing, onChange: () => game.onChange() });
      await game.duel.ready();
    }
    game.syncSound();
  };

  game.resize = (width, height, fill) => {
    Object.assign(state, { width, height, fill: Boolean(fill) });
    state.layout = playLayout(width, height, { fill: state.fill });
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
  game.press = (target) => {
    if (state.screen !== "avatar") {
      if (target.kind !== "volume") act(game, target);
      return;
    }
    const { state: pick, ask } = pickPress(state.pick, target);
    state.pick = pick;
    if (ask === "rename") onAsk("rename");
    if (ask === "done") {
      state.player = pick.choice;
      state.screen = "home";
      game.run(() => savePlayer(game.store, pick.choice));
    }
  };
  game.resting = () => state.paused;
  game.close = () => game.duel?.leave();
  return game;
}
