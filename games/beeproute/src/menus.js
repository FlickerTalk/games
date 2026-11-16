import { pickRename, startPick } from "../../../kit/src/avatars/index.js";
import { chooseLook } from "../../../kit/src/canvas/index.js";
import { addCommand, keepRound, pressRing, pressUndo, toggleRun } from "./driving.js";
import { playAgain, sendBuild, startFromHome } from "./flow.js";
import { LOOKS, PROGRESS } from "./levels.js";
import { paintAt } from "./touch.js";

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

function goHome(game) {
  const { state } = game;
  if (state.round?.run) state.round.run = null;
  if (state.screen === "play") keepRound(game);
  if (state.screen === "play" && ["level", "friend"].includes(state.round?.kind) && !state.round.finished) state.resume = state.round;
  Object.assign(state, { paused: false, screen: "home", build: null, hint: null, endAt: null });
  game.sound.pause(false);
}

function pause(game) {
  const { state } = game;
  if (state.round?.run) state.round.run = null;
  state.paused = true;
  game.sound.pause(true);
}

const ACTIONS = {
  speaker(game) {
    game.controls.toggle();
    game.state.volumeAt = game.now();
  },
  music: (game) => game.controls.toggleMusic(),
  pause,
  resume(game) {
    game.state.paused = false;
    game.sound.pause(false);
  },
  play: (game) => (game.state.screen === "play" ? toggleRun(game) : game.run(() => startFromHome(game))),
  again: (game) => game.run(() => playAgain(game)),
  variant(game, value) {
    game.state.variant = value;
    game.saveOwn();
  },
  avatar(game) {
    game.state.pick = startPick(game.state.player);
    game.state.screen = "avatar";
  },
  looks: (game) => (game.state.screen = "looks"),
  rival: (game) => game.relay && !game.relay.status.here && game.run(() => game.relay.retry()),
  home: goHome,
  done: (game) => (game.state.screen = "home"),
  tab: (game, value) => (game.state.looks = value),
  look: pickLook,
  gift(game) {
    game.state.outcome.opened = true;
    game.sound.play("star");
  },
  accept: (game) => game.run(() => game.relay.accept()),
  dismiss: (game) => game.relay.dismiss(),
  command: addCommand,
  ring: pressRing,
  undo: pressUndo,
  tool(game, value) {
    game.state.build.tool = value;
    game.sound.play("tap");
  },
  send: (game) => game.run(() => sendBuild(game)),
  cell: (game, value) => paintAt(game, value),
};

export function act(game, target) {
  ACTIONS[target.kind]?.(game, target.value);
  game.syncSound();
}

export function renamePlayer(game, text) {
  if (game.state.pick) game.state.pick = pickRename(game.state.pick, text);
}
