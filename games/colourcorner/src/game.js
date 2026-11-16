import { defaultPlayer, loadPlayer, pickPress, pickRename, savePlayer } from "../../../kit/src/avatars/index.js";
import { foldWhenIdle, playMode, soundState } from "../../../kit/src/canvas/index.js";
import { isChat } from "../../../kit/src/store.js";
import { SPREAD_MS, finishPage } from "./colouring.js";
import { Duo } from "./duo.js";
import { readOwn, readWall } from "./keep.js";
import { PROGRESS } from "./levels.js";
import { act } from "./menus.js";
import { canSend, layoutFor, targetsOf } from "./screens.js";
import { pointer } from "./touch.js";
import { duoFinished, follow } from "./together.js";
import { blankDrawing, blankWork } from "./work.js";

function freshState() {
  return {
    screen: "home", mode: "alone", lang: "en", chat: null, width: 0, height: 0, fill: false, layout: null,
    player: defaultPlayer(), progress: PROGRESS.fresh(), variant: "pages", taught: false, colour: 1, pattern: null,
    done: [], saved: 0, shared: 0, lastShared: null, tool: "fill", freeTool: "brush1", mirror: false,
    page: null, work: blankWork(), history: [], drawing: blankDrawing(), drawingSlot: null,
    scroll: { tools: 0, paints: 0 }, shelfPage: 0, wallPage: 0, wall: [], pictures: [], picture: null, choosing: false,
    spreads: [], moments: [], stroke: null, press: null, endAt: null, seenFills: null, touch: null,
    sound: { level: "high", music: true, open: false, volume: 1 }, volumeAt: 0, pick: null,
  };
}

async function openDuo(game, opening, app, timing) {
  game.duo = new Duo({ ft: game.ft, opening, app, timing, onChange: () => (follow(game), game.onChange()) });
  await game.duo.ready();
}

export function createGame({ ft, sound, controls, app = "1.0.0", now = () => performance.now(), random = Math.random, onAsk = () => {}, onChange = () => {}, picture = null, timing } = {}) {
  const state = freshState();
  const game = { ft, store: ft.store, sound, controls, now, random, onAsk, onChange, state, duo: null, pending: Promise.resolve() };

  game.run = (task) => {
    game.pending = game.pending.then(task).catch((error) => globalThis.console?.warn?.("colour corner:", error?.message ?? error)).finally(() => game.onChange());
    return game.pending;
  };
  game.idle = async () => {
    await game.pending;
    await game.duo?.table.idle();
    await game.pending;
  };
  game.syncSound = () => {
    state.sound = soundState(sound, controls);
  };
  game.relayout = () => {
    state.layout = layoutFor(game);
  };
  game.prompting = () => Boolean(game.duo?.status.prompt && ["home", "picture"].includes(state.screen));

  game.open = async (opening = {}) => {
    state.lang = opening.lang || "en";
    state.chat = isChat(opening.chat) ? opening.chat : null;
    state.mode = playMode(opening, state.chat);
    state.player = (await loadPlayer(game.store)) ?? defaultPlayer();
    state.progress = await PROGRESS.load(game.store);
    Object.assign(state, await readOwn(game.store));
    state.wall = await readWall(game.store);
    if (state.mode === "alone" && state.variant === "together") state.variant = "pages";
    if (state.mode !== "alone") await openDuo(game, { ...opening, chat: state.chat, solo: state.mode === "flick" }, app, timing);
    game.syncSound();
    game.relayout();
  };

  game.resize = (width, height, fill) => {
    Object.assign(state, { width, height, fill: Boolean(fill) });
    game.relayout();
  };

  game.targets = () => targetsOf(game);
  game.pointer = (event) => pointer(game, event);
  game.press = (target) => {
    if (state.screen !== "avatar") return act(game, target);
    const { state: pick, ask } = pickPress(state.pick, target);
    state.pick = pick;
    if (ask === "rename") onAsk("rename");
    if (ask === "done") {
      state.player = pick.choice;
      state.screen = "home";
      game.relayout();
      game.run(() => savePlayer(game.store, pick.choice));
    }
    return undefined;
  };
  game.rename = (text) => {
    if (state.pick) state.pick = pickRename(state.pick, text);
  };

  game.frame = (time) => {
    if (foldWhenIdle(state, controls, time)) game.syncSound();
    state.moments = state.moments.filter((moment) => time < moment.start + moment.duration);
    state.spreads = state.spreads.filter((one) => time < one.start + SPREAD_MS);
    if (state.endAt !== null && time >= state.endAt) {
      if (state.screen === "duo") duoFinished(game);
      else if (state.screen === "page") finishPage(game);
      else state.endAt = null;
    }
  };

  game.resting = () => {
    const busy = state.spreads.length || state.moments.length || state.endAt !== null || state.sound.open || state.stroke;
    const hint = !state.taught && ["page", "duo"].includes(state.screen);
    const waiting = state.screen === "duo" && game.duo && !game.duo.status.myTurn;
    return !busy && !hint && !waiting && state.screen !== "avatar";
  };

  game.sendPicture = async () => {
    if (!canSend(game) || !picture || !state.picture) return;
    const data = await picture(state.picture);
    if (data) ft.send("colour-corner.png", "image/png", data);
  };

  game.close = () => game.duo?.leave();
  return game;
}
