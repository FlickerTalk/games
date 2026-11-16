import { defaultPlayer, loadPlayer, pickLayout, pickPress, savePlayer } from "../../../kit/src/avatars/index.js";
import { endLayout, foldWhenIdle, homeLayout, looksLayout, pauseLayout, playMode, promptLayout, soundState } from "../../../kit/src/canvas/index.js";
import { isChat } from "../../../kit/src/store.js";
import { anchorOnScreen, familyOfSide, isMyTurn, roundKey, stepRound } from "./battle.js";
import { Duel } from "./duel.js";
import { LOOKS, PROGRESS } from "./levels.js";
import { playLayout, playTargets } from "./layout.js";
import { act, menuPointer, renamePlayer } from "./menus.js";
import { playPointer } from "./touch.js";
import { FIELDS } from "./world.js";

export const KINDS = Object.freeze(Object.keys(LOOKS));
const OWN_KEY = "painttanks";

async function readOwn(store) {
  try {
    const kept = JSON.parse((await store?.get(OWN_KEY)) ?? "null");
    return {
      variant: FIELDS.includes(kept?.variant) ? kept.variant : "land",
      practice: kept?.practice === true,
      taught: kept?.taught === true,
      flickRounds: Number.isInteger(kept?.flickRounds) && kept.flickRounds >= 0 ? kept.flickRounds : 0,
    };
  } catch {
    return { variant: "land", practice: false, taught: false, flickRounds: 0 };
  }
}

function freshState() {
  return {
    screen: "home", mode: "alone", lang: "en", chat: null, variant: "land", practice: false, taught: false, flickRounds: 0,
    width: 0, height: 0, fill: false, layout: null, player: defaultPlayer(), progress: PROGRESS.fresh(),
    round: null, moments: [], paused: false, outcome: null, flickThinking: false,
    sound: { level: "high", music: true, open: false, volume: 1 }, pick: null, looks: null, press: null, volumeAt: 0, resume: null,
  };
}

export function createGame({ ft, sound, controls, app = "1.0.0", now = () => performance.now(), random = Math.random, onAsk = () => {}, onChange = () => {} }) {
  const state = freshState();
  const game = { ft, store: ft.store, sound, controls, now, random, onAsk, onChange, state, duel: null, pending: Promise.resolve() };

  game.run = (task) => {
    game.pending = game.pending.then(task).catch((error) => globalThis.console?.warn?.("paint tanks:", error?.message ?? error)).finally(() => game.onChange());
    return game.pending;
  };
  game.idle = () => game.pending;
  game.saveOwn = () => game.run(() => game.store?.set(OWN_KEY, JSON.stringify({ variant: state.variant, practice: state.practice, taught: state.taught, flickRounds: state.flickRounds })));
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
    try {
      state.resume = JSON.parse((await game.store?.get(roundKey(state))) ?? "null");
    } catch {
      state.resume = null;
    }
    if (state.mode === "friend") {
      game.duel = new Duel({ ft, opening: { ...opening, chat: state.chat }, app, onChange: () => game.onChange() });
      await game.duel.ready();
    }
    game.syncSound();
  };

  game.resize = (width, height, fill) => {
    Object.assign(state, { width, height, fill: Boolean(fill) });
    state.layout = playLayout(width, height, { fill: state.fill, practice: state.round?.mode === "practice" });
  };

  game.myTurn = () => isMyTurn(game);
  game.anchorOnScreen = () => anchorOnScreen(game);
  game.targets = () => targetsOf(game);
  game.pointer = (event) => (state.screen === "play" ? playPointer(game, event) : menuPointer(game, event));
  game.frame = (time) => {
    if (foldWhenIdle(state, controls, time)) game.syncSound();
    stepRound(game, time);
    state.moments = state.moments.filter((moment) => time < moment.start + moment.duration);
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
  game.resting = () => state.paused;
  game.close = () => game.duel?.leave();
  return game;
}

function withVolume(game, targets) {
  return game.state.sound.open && game.state.layout ? [{ kind: "volume", value: "volume", ...game.state.layout.volume }, ...targets] : targets;
}

function playScreen(game) {
  const { state } = game;
  const { width, height, fill, round } = state;
  if (state.paused) return pauseLayout(width, height, { fill }).targets;
  const sub = round?.mySide !== null && round?.states.length > 0 && familyOfSide(round, round.mySide) === "sub";
  return playTargets(state.layout, { volume: state.sound.open, sub });
}

function targetsOf(game) {
  const { state } = game;
  const { width, height, fill } = state;
  if (game.duel?.status.prompt && ["home", "end"].includes(state.screen)) return promptLayout(width, height, { fill }).targets;
  if (state.screen === "play") return playScreen(game);
  if (state.screen === "home") return withVolume(game, homeLayout(width, height, { variants: FIELDS, rival: state.mode !== "alone", fill }).targets);
  if (state.screen === "end") return withVolume(game, endLayout(width, height, { gift: Boolean(state.outcome?.gift && !state.outcome.opened), fill }).targets);
  if (state.screen === "looks") return looksLayout(width, height, { kind: state.looks ?? "kinds", count: state.looks ? LOOKS[state.looks].length : KINDS.length, fill }).targets;
  if (state.screen === "avatar" && state.pick) return pickLayout(state.pick, width, height, state.lang).targets.filter((one) => one.visible);
  return [];
}
