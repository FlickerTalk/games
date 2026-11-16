import { pickRename, startPick } from "../../../kit/src/avatars/index.js";
import { chooseLook } from "../../../kit/src/canvas/index.js";
import { keepRound, pressDie, startRound } from "./flow.js";
import { LOOKS, PROGRESS } from "./levels.js";

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
  const { round } = state;
  if (state.screen === "play" && round && round.kind !== "friend" && round.race.winner === null) {
    keepRound(game);
    state.resume = round;
  }
  if (game.duel?.active) game.run(() => game.duel.leave());
  Object.assign(state, { paused: false, screen: "home", round: null, hint: false, endAt: null, flickAt: null });
  game.sound.pause(false);
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
  play: (game) => game.run(() => startRound(game)),
  again: (game) => game.run(() => startRound(game)),
  variant(game, value) {
    game.state.variant = value;
    game.saveOwn();
  },
  avatar(game) {
    game.state.pick = startPick(game.state.player);
    game.state.screen = "avatar";
  },
  looks: (game) => (game.state.screen = "looks"),
  rival: (game) => game.duel && !game.duel.status.here && game.run(() => game.duel.retry()),
  home: goHome,
  done: (game) => (game.state.screen = "home"),
  tab: (game, value) => (game.state.looks = value),
  look: pickLook,
  gift(game) {
    game.state.outcome.opened = true;
    game.sound.play("star");
  },
  accept: (game) => game.run(() => game.duel.accept()),
  dismiss: (game) => game.duel.dismiss(),
  die: pressDie,
};

export function act(game, target) {
  ACTIONS[target.kind]?.(game, target.value);
  game.syncSound();
}

export function renamePlayer(game, text) {
  if (game.state.pick) game.state.pick = pickRename(game.state.pick, text);
}
