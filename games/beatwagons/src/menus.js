import { pickRename, startPick } from "../../../kit/src/avatars/index.js";
import { chooseLook } from "../../../kit/src/canvas/index.js";
import { addWagon, checkBuilt, cycleBeats, toggleGap, undoWagon } from "./composer.js";
import { playAgain, sendBuild, startFromHome } from "./flow.js";
import { LOOKS, PROGRESS } from "./levels.js";
import { keepRound, placeWagon, soundWagon } from "./playing.js";

const SHAKE_MS = 600;
const KEPT = ["level", "friend"];

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
  if (state.screen === "play") keepRound(game);
  if (state.screen === "play" && KEPT.includes(state.round?.kind) && !state.round.finished) state.resume = state.round;
  Object.assign(state, { paused: false, screen: "home", build: null, hint: null, endAt: null, drag: null });
  game.sound.pause(false);
}

function rebuild(game, build) {
  const { state } = game;
  const changed = build !== state.build;
  state.build = { ...build, tune: null, check: checkBuilt(build) };
  return changed;
}

function couple(game, kind) {
  const { build } = game.state;
  if (!rebuild(game, addWagon(build, kind))) {
    game.sound.play("error-soft");
    return;
  }
  soundWagon(game.sound, game.state.build.wagons.at(-1));
}

const ACTIONS = {
  speaker(game) {
    game.controls.toggle();
    game.state.volumeAt = game.now();
  },
  music: (game) => game.controls.toggleMusic(),
  pause(game) {
    game.state.paused = true;
    game.state.pausedAt = game.now();
    game.sound.pause(true);
  },
  resume: (game) => game.unpause(),
  play: (game) => game.run(() => startFromHome(game)),
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
  candidate: (game, value) => placeWagon(game, value),
  wagon: couple,
  undo(game) {
    if (rebuild(game, undoWagon(game.state.build))) game.sound.play("pick");
  },
  dots(game) {
    rebuild(game, cycleBeats(game.state.build));
    game.sound.play("tap");
  },
  slot(game, value) {
    if (rebuild(game, toggleGap(game.state.build, value))) game.sound.play("place");
  },
  send: (game) => game.run(() => sendBuild(game)),
};

export function act(game, target) {
  ACTIONS[target.kind]?.(game, target.value);
  game.syncSound();
}

export function renamePlayer(game, text) {
  if (game.state.pick) game.state.pick = pickRename(game.state.pick, text);
}
