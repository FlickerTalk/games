import { defaultPlayer, loadPlayer, pickLayout, pickPress, savePlayer } from "../../../kit/src/avatars/index.js";
import { endLayout, foldWhenIdle, homeLayout, looksLayout, pauseLayout, playMode, promptLayout, soundState } from "../../../kit/src/canvas/index.js";
import { isChat } from "../../../kit/src/store.js";
import { advanceFriend, joinFriend, roundKey } from "./duel.js";
import { LOOKS, PROGRESS } from "./levels.js";
import { playLayout, playTargets } from "./layout.js";
import { act, menuPointer, renamePlayer } from "./menus.js";
import { advanceLocal } from "./rounds.js";
import { playPointer, pressThird, roleOf } from "./touch.js";

export const VARIANTS = Object.freeze(["flick", "pair"]);
const OWN_KEY = "goalswipe";
const THIRDS = ["shoot", "dive"];

async function readOwn(store) {
  try {
    const kept = JSON.parse((await store?.get(OWN_KEY)) ?? "null");
    return {
      variant: VARIANTS.includes(kept?.variant) ? kept.variant : "flick",
      taught: { shoot: kept?.taught?.shoot === true, keep: kept?.taught?.keep === true },
      awarded: typeof kept?.awarded === "string" ? kept.awarded : null,
    };
  } catch {
    return { variant: "flick", taught: { shoot: false, keep: false }, awarded: null };
  }
}

function freshState() {
  return {
    screen: "home", mode: "alone", lang: "en", chat: null, variant: "flick", taught: { shoot: false, keep: false }, awarded: null,
    width: 0, height: 0, fill: false, layout: null, player: defaultPlayer(), progress: PROGRESS.fresh(),
    round: null, outcome: null, paused: false, moments: [], pick: null, looks: "ball", press: null,
    sound: { level: "high", music: true, open: false, volume: 1 }, volumeAt: 0,
  };
}

export function createGame({ ft, sound, controls, app = "1.0.0", now = () => performance.now(), random = Math.random, onAsk = () => {}, onChange = () => {} }) {
  const state = freshState();
  const game = { ft, store: ft.store, sound, controls, app, now, random, onAsk, onChange, state, friend: null, pending: Promise.resolve() };

  game.run = (task) => {
    game.pending = game.pending.then(task).catch((error) => globalThis.console?.warn?.("goal swipe:", error?.message ?? error)).finally(() => game.onChange());
    return game.pending;
  };
  game.idle = () => game.pending;
  game.saveOwn = () => game.run(() => game.store?.set(OWN_KEY, JSON.stringify({ variant: state.variant, taught: state.taught, awarded: state.awarded })));
  game.saveProgress = () => game.run(() => PROGRESS.save(game.store, state.progress));
  game.syncSound = () => {
    state.sound = soundState(sound, controls);
  };
  game.roundAwarded = () => {
    const seen = game.friend?.seen;
    if (!seen) return;
    state.awarded = roundKey(seen);
    game.friend.wanted = false;
    game.saveOwn();
  };

  game.open = async (opening = {}) => {
    state.lang = opening.lang || "en";
    state.chat = isChat(opening.chat) ? opening.chat : null;
    state.mode = playMode(opening, state.chat);
    state.player = (await loadPlayer(game.store)) ?? defaultPlayer();
    state.progress = await PROGRESS.load(game.store);
    Object.assign(state, await readOwn(game.store));
    if (state.mode === "friend") await joinFriend(game, opening);
    game.syncSound();
  };

  game.resize = (width, height, fill) => {
    Object.assign(state, { width, height, fill: Boolean(fill), layout: playLayout(width, height, { fill }) });
  };

  game.targets = () => targetsOf(game);
  game.pointer = (event) => (state.screen === "play" ? playPointer(game, event) : menuPointer(game, event));
  game.frame = (time) => {
    if (foldWhenIdle(state, controls, time)) game.syncSound();
    state.moments = state.moments.filter((moment) => state.paused || time < moment.start + moment.duration);
    if (game.friend) advanceFriend(game);
    else if (state.screen === "play" && state.round) advanceLocal(game);
  };
  game.rename = (text) => renamePlayer(game, text);
  game.press = (target) => {
    if (THIRDS.includes(target.kind)) return void pressThird(game, target);
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
  game.resting = () => state.screen === "play" && state.paused && !game.friend;
  game.close = () => game.friend?.leave();
  return game;
}

function withVolume(game, targets) {
  return game.state.sound.open && game.state.layout ? [{ kind: "volume", value: "volume", ...game.state.layout.volume }, ...targets] : targets;
}

function targetsOf(game) {
  const { state } = game;
  const { width, height, fill } = state;
  if (game.friend?.status.prompt && ["home", "end"].includes(state.screen)) return promptLayout(width, height, { fill }).targets;
  if (state.screen === "play") return state.paused ? pauseLayout(width, height, { fill }).targets : playTargets(state.layout, { volume: state.sound.open, role: roleOf(game) });
  if (state.screen === "home") return withVolume(game, homeLayout(width, height, { variants: state.mode === "alone" ? VARIANTS : [], rival: state.mode !== "alone", fill }).targets);
  if (state.screen === "end") return withVolume(game, endLayout(width, height, { gift: Boolean(state.outcome?.gift && !state.outcome.opened), fill }).targets);
  if (state.screen === "looks") return looksLayout(width, height, { kind: state.looks, count: LOOKS[state.looks].length, fill, tabs: Object.keys(LOOKS) }).targets;
  if (state.screen === "avatar" && state.pick) return pickLayout(state.pick, width, height, state.lang).targets.filter((one) => one.visible);
  return [];
}
