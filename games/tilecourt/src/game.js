import { defaultPlayer, loadPlayer, pickLayout, pickPress, savePlayer } from "../../../kit/src/avatars/index.js";
import { isChat } from "../../../kit/src/store.js";
import { idleDrag } from "./drag.js";
import { Duel } from "./duel.js";
import { PROGRESS } from "./levels.js";
import { playLayout, playTargets } from "./layout.js";
import { endLayout, homeLayout, looksLayout, pauseLayout, promptLayout } from "../../../kit/src/canvas/menu-layout.js";
import { act, menuPointer, renamePlayer } from "./menus.js";
import { finishDue, roundKey } from "./rounds.js";
import { playPointer } from "./touch.js";

export const VARIANT_ORDER = Object.freeze(["main", "small", "big", "daily"]);
const OWN_KEY = "tilecourt";
const FOLD_MS = 3000;

function modeOf(opening, chat) {
  if (!chat) return "alone";
  if (opening.solo === true) return "flick";
  return opening.live ? "friend" : "alone";
}

async function readOwn(store) {
  try {
    const kept = JSON.parse((await store?.get(OWN_KEY)) ?? "null");
    return { variant: VARIANT_ORDER.includes(kept?.variant) ? kept.variant : "main", taught: kept?.taught === true };
  } catch {
    return { variant: "main", taught: false };
  }
}

function freshState() {
  return {
    screen: "home", mode: "alone", lang: "en", chat: null, variant: "main", taught: false,
    width: 0, height: 0, fill: false, layout: null, player: defaultPlayer(), progress: PROGRESS.fresh(),
    round: null, drag: idleDrag(), moments: [], hint: null, paused: false, outcome: null, flick: null,
    sound: { level: "high", music: true, open: false, volume: 1 }, pick: null, looks: "court", press: null,
    volumeAt: 0, endAt: null, resume: null, returning: null, rival: null,
  };
}

export function createGame({ ft, sound, controls, app = "1.0.0", now = () => performance.now(), random = Math.random, onAsk = () => {}, onChange = () => {} }) {
  const state = freshState();
  const game = { ft, store: ft.store, sound, controls, now, random, onAsk, onChange, state, duel: null, pending: Promise.resolve() };

  game.run = (task) => {
    game.pending = game.pending.then(task).catch((error) => globalThis.console?.warn?.("tile court:", error?.message ?? error)).finally(() => game.onChange());
    return game.pending;
  };
  game.idle = () => game.pending;
  game.saveOwn = () => game.run(() => game.store?.set(OWN_KEY, JSON.stringify({ variant: state.variant, taught: state.taught })));
  game.saveProgress = () => game.run(() => PROGRESS.save(game.store, state.progress));
  game.syncSound = () => {
    const { volume, music } = sound.settings;
    state.sound = { level: controls.icon, music, open: controls.open, volume };
  };

  game.open = async (opening = {}) => {
    state.lang = opening.lang || "en";
    state.chat = isChat(opening.chat) ? opening.chat : null;
    state.mode = modeOf(opening, state.chat);
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
    const size = state.round ? state.round.court.size : 8;
    const tray = state.round ? state.round.slots.length : 3;
    state.layout = playLayout(width, height, { size, tray, rival: Boolean(state.rival), fill: state.fill });
  };

  game.targets = () => targetsOf(game);
  game.pointer = (event) => (state.screen === "play" ? playPointer(game, event) : menuPointer(game, event));
  game.frame = (time) => {
    if (state.sound.open && time - state.volumeAt > FOLD_MS) {
      controls.fold();
      game.syncSound();
    }
    state.moments = state.moments.filter((moment) => time < moment.start + moment.duration);
    if (state.returning && time >= state.returning.until) state.returning = null;
    if (state.endAt !== null && time >= state.endAt) finishDue(game);
  };
  game.rename = (text) => renamePlayer(game, text);
  game.press = (target) => {
    if (state.screen !== "avatar") return target.kind === "slot" || target.kind === "volume" ? undefined : act(game, target);
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
  game.close = () => game.duel?.leave();
  return game;
}

function withVolume(game, targets) {
  return game.state.sound.open && game.state.layout ? [{ kind: "volume", value: "volume", ...game.state.layout.volume }, ...targets] : targets;
}

function targetsOf(game) {
  const { state } = game;
  const { width, height, fill } = state;
  const prompt = game.duel?.status.prompt && ["home", "end"].includes(state.screen);
  if (prompt) return promptLayout(width, height, { fill }).targets;
  if (state.screen === "play") return state.paused ? pauseLayout(width, height, { fill }).targets : playTargets(state.layout, { volume: state.sound.open });
  if (state.screen === "home") return withVolume(game, homeLayout(width, height, { variants: VARIANT_ORDER, rival: state.mode !== "alone", fill }).targets);
  if (state.screen === "end") return withVolume(game, endLayout(width, height, { gift: Boolean(state.outcome?.gift && !state.outcome.opened), fill }).targets);
  if (state.screen === "looks") return looksLayout(width, height, { kind: state.looks, count: state.looks === "court" ? 5 : 6, fill, tabs: ["court", "effect"] }).targets;
  if (state.screen === "avatar" && state.pick) return pickLayout(state.pick, width, height, state.lang).targets.filter((one) => one.visible);
  return [];
}
