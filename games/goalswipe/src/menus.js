import { pickLayout, pickPointer, pickRename, savePlayer, startPick } from "../../../kit/src/avatars/index.js";
import { chooseLook, pressTargets, volumePointer } from "../../../kit/src/canvas/index.js";
import { startFriend } from "./duel.js";
import { LOOKS, PROGRESS } from "./levels.js";
import { beginLocal, leaveRound } from "./rounds.js";

const SHAKE_MS = 600;

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

function play(game) {
  const { state } = game;
  if (state.mode === "friend") return startFriend(game);
  return beginLocal(game, state.mode === "alone" && state.variant === "pair" ? "pair" : "flick");
}

const ACTIONS = {
  speaker(game) {
    game.controls.toggle();
    game.state.volumeAt = game.now();
  },
  music: (game) => game.controls.toggleMusic(),
  pause(game) {
    game.state.paused = true;
    game.sound.pause(true);
  },
  resume(game) {
    game.state.paused = false;
    game.sound.pause(false);
  },
  play,
  again: play,
  rival: (game) => game.state.mode === "friend" && startFriend(game),
  variant(game, value) {
    game.state.variant = value;
    game.saveOwn();
  },
  avatar(game) {
    game.state.pick = startPick(game.state.player);
    game.state.screen = "avatar";
  },
  looks: (game) => (game.state.screen = "looks"),
  home: (game) => (game.state.screen === "play" ? leaveRound(game) : (game.state.screen = "home")),
  done: (game) => (game.state.screen = "home"),
  tab: (game, value) => (game.state.looks = value),
  look: (game, value) => pickLook(game, value),
  gift(game) {
    game.state.outcome.opened = true;
    game.sound.play("star");
  },
  accept: (game) => game.run(() => game.friend.accept()),
  dismiss: (game) => game.friend.dismiss(),
};

export function act(game, target) {
  ACTIONS[target.kind]?.(game, target.value);
  game.syncSound();
}

function avatarPointer(game, event) {
  const { state } = game;
  const layout = pickLayout(state.pick, state.width, state.height, state.lang);
  const { state: pick, ask } = pickPointer(state.pick, layout, event);
  state.pick = pick;
  if (ask === "rename") game.onAsk("rename");
  if (ask === "done") {
    state.player = pick.choice;
    state.screen = "home";
    game.run(() => savePlayer(game.store, pick.choice));
  }
}

export function soundPointer(game, event) {
  const { state } = game;
  return volumePointer(state, event, { volume: state.layout?.volume, controls: game.controls, targets: game.targets(), now: game.now, sync: game.syncSound });
}

export function menuPointer(game, event) {
  if (game.state.screen === "avatar") return avatarPointer(game, event);
  if (soundPointer(game, event)) return undefined;
  return pressTargets(game.state, game.targets(), event, (target) => act(game, target));
}

export function renamePlayer(game, text) {
  if (game.state.pick) game.state.pick = pickRename(game.state.pick, text);
}
