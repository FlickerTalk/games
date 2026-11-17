import { defaultPlayer, loadPlayer, pickLayout, pickPress, savePlayer } from "../../../kit/src/avatars/index.js";
import { endLayout, foldWhenIdle, homeLayout, looksLayout, pauseLayout, playMode, promptLayout, soundState } from "../../../kit/src/canvas/index.js";
import { isChat } from "../../../kit/src/store.js";
import { endRound, followDuel } from "./flow.js";
import { composeLayout, layoutTargets, playLayout } from "./layout.js";
import { LOOKS, PROGRESS } from "./levels.js";
import { act, renamePlayer } from "./menus.js";
import { frameRound } from "./playing.js";
import { Relay } from "./relay.js";
import { keptRound, roundKey } from "./rounds.js";
import { pointerOf } from "./touch.js";
import { playWagon, tuneLength, tuneOf } from "./tune.js";

export const VARIANTS = Object.freeze(["levels", "make"]);
const OWN_KEY = "beatwagons";
const LOOK_TABS = ["engine", "scenery"];

async function readOwn(store) {
  try {
    const kept = JSON.parse((await store?.get(OWN_KEY)) ?? "null");
    return { variant: VARIANTS.includes(kept?.variant) ? kept.variant : "levels", taught: kept?.taught === true };
  } catch {
    return { variant: "levels", taught: false };
  }
}

async function readRound(store, state) {
  try {
    return keptRound(JSON.parse((await store?.get(roundKey(state))) ?? "null"));
  } catch {
    return null;
  }
}

function freshState() {
  return {
    screen: "home", mode: "alone", lang: "en", chat: null, variant: "levels", taught: false,
    width: 0, height: 0, fill: false, layout: null, player: defaultPlayer(), progress: PROGRESS.fresh(),
    round: null, build: null, resume: null, moments: [], hint: null, drag: null, paused: false, pausedAt: 0, outcome: null, endAt: null, wanting: false,
    sound: { level: "high", music: true, open: false, volume: 1 }, pick: null, looks: "engine", press: null, volumeAt: 0,
  };
}

export const hasRival = (state) => state.mode !== "alone" || (Boolean(state.round) && (state.round.maker !== null || state.round.driver !== "me"));

function layoutOf(state) {
  const { width, height, fill, round, screen } = state;
  const rival = hasRival(state);
  if (screen === "build") return composeLayout(width, height, { fill, rival, gaps: state.mode !== "alone" });
  if ((screen === "play" || screen === "end") && round) return playLayout(width, height, { count: round.puzzle.train.wagons.length, choices: round.candidates.length, fill, rival });
  return playLayout(width, height, { fill, rival });
}

function withVolume(game, targets) {
  const { state } = game;
  return state.sound.open && state.layout ? [{ kind: "volume", value: "volume", ...state.layout.volume }, ...targets] : targets;
}

function targetsOf(game) {
  const { state } = game;
  const { width, height, fill, screen } = state;
  if (game.relay?.status.prompt && ["home", "end"].includes(screen)) return promptLayout(width, height, { fill }).targets;
  if ((screen === "play" || screen === "build") && state.paused) return pauseLayout(width, height, { fill }).targets;
  if (screen === "play" || screen === "build") return layoutTargets(state.layout, { volume: state.sound.open });
  if (screen === "home") return withVolume(game, homeLayout(width, height, { variants: VARIANTS, rival: state.mode !== "alone", fill }).targets);
  if (screen === "end") return withVolume(game, endLayout(width, height, { gift: Boolean(state.outcome?.gift && !state.outcome.opened), fill }).targets);
  if (screen === "looks") return looksLayout(width, height, { kind: state.looks, count: LOOKS[state.looks].length, fill, tabs: LOOK_TABS }).targets;
  if (screen === "avatar" && state.pick) return pickLayout(state.pick, width, height, state.lang).targets.filter((one) => one.visible);
  return [];
}

function frameTune(game, time) {
  const { build } = game.state;
  const notes = tuneOf(build.wagons);
  const elapsed = time - build.tune.start;
  while (build.tune.fired < notes.length && elapsed >= notes[build.tune.fired].at) {
    playWagon(game.sound, build.wagons[notes[build.tune.fired].index]);
    build.tune.fired += 1;
  }
  if (elapsed >= tuneLength(build.wagons)) build.tune = null;
}

function shiftClocks(state, by) {
  const { round, build } = state;
  for (const moment of state.moments) moment.start += by;
  if (build?.tune) build.tune.start += by;
  if (!round) return;
  round.phaseAt += by;
  round.scriptAt += by;
  if (round.flying) round.flying.start += by;
  if (round.back) round.back.start += by;
  if (state.endAt !== null) state.endAt += by;
}

export function createGame({ ft, sound, controls, app = "1.0.0", now = () => performance.now(), random = Math.random, onAsk = () => {}, onChange = () => {} }) {
  const state = freshState();
  const game = { ft, store: ft.store, sound, controls, now, random, onAsk, onChange, state, relay: null, pending: Promise.resolve() };

  game.run = (task) => {
    game.pending = game.pending.then(task).catch((error) => globalThis.console?.warn?.("beat wagons:", error?.message ?? error)).finally(() => game.onChange());
    return game.pending;
  };
  game.idle = () => game.pending;
  game.saveOwn = () => game.run(() => game.store?.set(OWN_KEY, JSON.stringify({ variant: state.variant, taught: state.taught })));
  game.saveProgress = () => game.run(() => PROGRESS.save(game.store, state.progress));
  game.syncSound = () => {
    state.sound = soundState(sound, controls);
  };
  game.relayout = () => game.resize(state.width, state.height, state.fill);
  game.unpause = () => {
    shiftClocks(state, game.now() - state.pausedAt);
    state.paused = false;
    sound.pause(false);
  };

  game.open = async (opening = {}) => {
    state.lang = opening.lang || "en";
    state.chat = isChat(opening.chat) ? opening.chat : null;
    state.mode = playMode(opening, state.chat);
    state.player = (await loadPlayer(game.store)) ?? defaultPlayer();
    state.progress = await PROGRESS.load(game.store);
    Object.assign(state, await readOwn(game.store));
    state.resume = await readRound(game.store, state);
    if (state.mode === "friend") {
      const heard = () => (state.wanting ? game.run(() => followDuel(game)) : game.onChange());
      game.relay = new Relay({ ft, opening: { ...opening, chat: state.chat }, app, onChange: heard });
      await game.relay.ready();
    }
    game.syncSound();
  };

  game.resize = (width, height, fill) => {
    Object.assign(state, { width, height, fill: Boolean(fill) });
    state.layout = layoutOf(state);
  };

  game.targets = () => targetsOf(game);
  game.pointer = (event) => pointerOf(game, event);
  game.frame = (time) => {
    if (foldWhenIdle(state, controls, time)) game.syncSound();
    if (state.paused) return;
    state.moments = state.moments.filter((moment) => time < moment.start + moment.duration);
    if (state.screen === "play") frameRound(game, time);
    if (state.screen === "build" && state.build?.tune) frameTune(game, time);
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
  game.close = () => game.relay?.leave();
  return game;
}
