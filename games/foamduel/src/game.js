import { defaultPlayer, loadPlayer, pickLayout, pickPress, savePlayer } from "../../../kit/src/avatars/index.js";
import { endLayout, foldWhenIdle, homeLayout, looksLayout, pauseLayout, playMode, soundState } from "../../../kit/src/canvas/index.js";
import { isChat } from "../../../kit/src/store.js";
import { advanceFriend, joinFriend } from "./friend.js";
import { LOOKS, PROGRESS, VARIANTS } from "./levels.js";
import { playLayout, playTargets } from "./layout.js";
import { act, menuPointer, renamePlayer } from "./menus.js";
import { advanceLocal } from "./rounds.js";
import { playPointer } from "./touch.js";

const OWN_KEY = "foamduel";

async function readOwn(store) {
  try {
    const kept = JSON.parse((await store?.get(OWN_KEY)) ?? "null");
    return { variant: VARIANTS.includes(kept?.variant) ? kept.variant : VARIANTS[0], taught: kept?.taught === true };
  } catch {
    return { variant: VARIANTS[0], taught: false };
  }
}

function freshState() {
  return {
    screen: "home", mode: "alone", lang: "en", chat: null, variant: VARIANTS[0], taught: false,
    width: 0, height: 0, fill: false, layout: null, player: defaultPlayer(), progress: PROGRESS.fresh(),
    round: null, outcome: null, paused: false, moments: [], pick: null, looks: "sword", press: null,
    sound: { level: "high", music: true, open: false, volume: 1 }, volumeAt: 0,
  };
}

export const homeOf = (state) => homeLayout(state.width, state.height, { variants: state.mode === "alone" ? VARIANTS : [], rival: state.mode !== "alone", fill: state.fill });
export const looksOf = (state) => looksLayout(state.width, state.height, { kind: state.looks, count: LOOKS[state.looks].length, fill: state.fill, tabs: Object.keys(LOOKS) });

function withVolume(game, targets) {
  return game.state.sound.open && game.state.layout ? [{ kind: "volume", value: "volume", ...game.state.layout.volume }, ...targets] : targets;
}

function targetsOf(game) {
  const { state } = game;
  const { width, height, fill } = state;
  if (state.screen === "play") return state.paused ? pauseLayout(width, height, { fill }).targets : playTargets(state.layout, { volume: state.sound.open });
  if (state.screen === "home") return withVolume(game, homeOf(state).targets);
  if (state.screen === "end") return withVolume(game, endLayout(width, height, { gift: Boolean(state.outcome?.gift && !state.outcome.opened), fill }).targets);
  if (state.screen === "looks") return looksOf(state).targets;
  if (state.screen === "avatar" && state.pick) return pickLayout(state.pick, width, height, state.lang).targets.filter((one) => one.visible);
  return [];
}

export function createGame({ ft, sound, controls, app = "1.0.0", now = () => performance.now(), random = Math.random, onAsk = () => {}, onChange = () => {} }) {
  const state = freshState();
  const game = { ft, store: ft.store, sound, controls, app, now, random, onAsk, onChange, state, duel: null, pending: Promise.resolve() };

  game.run = (task) => {
    game.pending = game.pending.then(task).catch((error) => globalThis.console?.warn?.("foam duel:", error?.message ?? error)).finally(() => game.onChange());
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
    if (state.mode === "friend") joinFriend(game);
    game.syncSound();
  };

  game.resize = (width, height, fill) => {
    Object.assign(state, { width, height, fill: Boolean(fill), layout: playLayout(width, height, { fill, pair: state.round?.kind === "pair" }) });
  };

  game.targets = () => targetsOf(game);
  game.pointer = (event) => (state.screen === "play" ? playPointer(game, event) : menuPointer(game, event));
  game.frame = (time) => {
    if (foldWhenIdle(state, controls, time)) game.syncSound();
    state.moments = state.moments.filter((moment) => time < moment.start + moment.duration);
    if (game.duel) advanceFriend(game, time);
    else if (state.screen === "play" && state.round) advanceLocal(game);
  };
  game.rename = (text) => renamePlayer(game, text);
  game.press = (target) => {
    if (state.screen !== "avatar") return target.kind === "volume" ? undefined : act(game, target);
    const { state: pick, ask } = pickPress(state.pick, target);
    state.pick = pick;
    if (ask === "rename") onAsk("rename");
    if (ask === "done") {
      state.player = pick.choice;
      state.screen = "home";
      game.run(() => savePlayer(game.store, pick.choice));
    }
    return undefined;
  };
  game.resting = () => state.screen === "play" && state.paused && !game.duel;
  game.close = () => game.duel?.leave();
  return game;
}
