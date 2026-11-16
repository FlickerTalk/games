import { pickLayout, pickPointer, pickRename, savePlayer, startPick } from "../../../kit/src/avatars/index.js";
import { chooseLook, pressTargets, volumePointer } from "../../../kit/src/canvas/index.js";
import { startFriend } from "./friend.js";
import { HULLS, PAGE, PAGES, PROGRESS, WORLDS, hullOf } from "./levels.js";
import { beginLocal, leaveRound } from "./rounds.js";

const SHAKE_MS = 600;

function pickLook(game, index) {
  const { state } = game;
  const look = HULLS[state.world][state.page * PAGE + index];
  if (!look) return;
  const { record, owned } = chooseLook(PROGRESS, state.progress, look);
  state.progress = record;
  if (owned) game.saveProgress();
  else state.moments.push({ kind: "shake", index, start: game.now(), duration: SHAKE_MS });
  game.sound.play("tap");
}

const play = (game) => (game.state.mode === "friend" ? startFriend(game) : beginLocal(game));

const ACTIONS = {
  speaker(game) {
    game.controls.toggle();
    game.state.volumeAt = game.now();
  },
  music: (game) => game.controls.toggleMusic(),
  pause(game) {
    game.state.paused = true;
    game.state.steer = null;
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
    if (!WORLDS.includes(value)) return;
    game.state.world = value;
    game.sound.play("tap");
    game.saveOwn();
  },
  avatar(game) {
    game.state.pick = startPick(game.state.player);
    game.state.screen = "avatar";
  },
  looks(game) {
    const { state } = game;
    state.page = Math.floor(HULLS[state.world].indexOf(hullOf(state.progress, state.world)) / PAGE);
    state.screen = "looks";
  },
  tab: (game, value) => PAGES.includes(value) && (game.state.page = value),
  home: (game) => (game.state.screen === "play" ? leaveRound(game) : (game.state.screen = "home")),
  done: (game) => (game.state.screen = "home"),
  look: (game, value) => pickLook(game, value),
  gift(game) {
    game.state.outcome.opened = true;
    game.sound.play("star");
  },
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
