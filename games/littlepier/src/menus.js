import { pickLayout, pickPointer, pickRename, savePlayer, startPick } from "../../../kit/src/avatars/index.js";
import { pressTargets as pressCanvas, volumePointer as volumeCanvas } from "../../../kit/src/canvas/input.js";
import { chooseLook } from "../../../kit/src/canvas/screens.js";
import { LOOKS, PROGRESS } from "./levels.js";
import { beginRound, keepRound } from "./rounds.js";

const SHAKE_MS = 600;
const CAST_MS = 1400;

export const pressTargets = (game, event, onPress) => pressCanvas(game.state, game.targets(), event, onPress);

export function volumePointer(game, event) {
  const { state } = game;
  return volumeCanvas(state, event, { volume: state.layout?.volume, controls: game.controls, targets: game.targets(), now: game.now, sync: game.syncSound });
}

function pickLook(game, index) {
  const { state } = game;
  const look = LOOKS[state.looks][index];
  if (!look) return;
  const { record, owned } = chooseLook(PROGRESS, state.progress, look);
  state.progress = record;
  if (owned) game.saveProgress();
  else state.moments.push({ kind: "shake", index, start: game.now(), duration: SHAKE_MS });
  game.sound.play("tap");
}

function leaveRound(game) {
  const { state } = game;
  state.paused = false;
  game.sound.pause(false);
  game.sound.drone?.("sea", null);
  keepRound(game);
  state.resume = state.snapshot;
  Object.assign(state, { screen: "home", holding: false, finger: null });
}

function pause(game, on) {
  game.state.paused = on;
  game.state.holding = false;
  game.state.finger = null;
  game.state.frameAt = game.now();
  game.sound.pause(on);
  if (on) keepRound(game);
}

const ACTIONS = {
  speaker(game) {
    game.controls.toggle();
    game.state.volumeAt = game.now();
  },
  music: (game) => game.controls.toggleMusic(),
  pause: (game) => pause(game, true),
  resume: (game) => pause(game, false),
  play: (game) => game.run(() => beginRound(game)),
  again: (game) => game.run(() => beginRound(game)),
  variant: (game) => (game.state.screen = "album"),
  avatar(game) {
    game.state.pick = startPick(game.state.player);
    game.state.screen = "avatar";
  },
  looks: (game) => (game.state.screen = "looks"),
  rival: (game) => game.duel && !game.duel.status.here && game.run(() => game.duel.retry()),
  home: (game) => (game.state.screen === "play" ? leaveRound(game) : (game.state.screen = "home")),
  done: (game) => (game.state.screen = "home"),
  tab: (game, value) => (game.state.looks = value),
  look: (game, value) => pickLook(game, value),
  water: (game) => (game.state.cast = game.now() + CAST_MS),
  gift(game) {
    game.state.outcome.opened = true;
    game.sound.play("star");
  },
  accept: (game) => game.run(() => game.duel.accept()),
  dismiss: (game) => game.duel.dismiss(),
};

export function act(game, target) {
  ACTIONS[target.kind]?.(game, target.value);
  game.syncSound();
}

function chosen(game, choice) {
  game.state.player = choice;
  game.state.screen = "home";
  game.run(() => savePlayer(game.store, choice));
}

function avatarPointer(game, event) {
  const { state } = game;
  const layout = pickLayout(state.pick, state.width, state.height, state.lang);
  const { state: pick, ask } = pickPointer(state.pick, layout, event);
  state.pick = pick;
  if (ask === "rename") game.onAsk("rename");
  if (ask === "done") chosen(game, pick.choice);
}

export function menuPointer(game, event) {
  if (game.state.screen === "avatar") return avatarPointer(game, event);
  if (volumePointer(game, event)) return undefined;
  return pressTargets(game, event, (target) => act(game, target));
}

export function renamePlayer(game, text) {
  if (game.state.pick) game.state.pick = pickRename(game.state.pick, text);
}

export { chosen as choosePlayer };
