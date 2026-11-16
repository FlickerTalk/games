import { pickRename, startPick } from "../../../kit/src/avatars/index.js";
import { chooseLook } from "../../../kit/src/canvas/screens.js";
import { beginRound } from "./flow.js";
import { LOOKS, PROGRESS } from "./levels.js";
import { keepRound, pressHit } from "./playing.js";

const SHAKE_MS = 600;
const KEPT = ["alone", "flick"];

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
  if (state.screen === "play" && round && !round.finished) {
    keepRound(game);
    if (KEPT.includes(round.kind)) state.resume = { kind: round.kind, setup: round.setup, hits: [...round.hits] };
  }
  Object.assign(state, { paused: false, screen: "home", hint: null, endAt: null, wanting: false });
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
  play: (game) => game.run(() => beginRound(game)),
  again: (game) => game.run(() => beginRound(game)),
  hit: pressHit,
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
};

export function act(game, target) {
  ACTIONS[target.kind]?.(game, target.value);
  game.syncSound();
}

export function renamePlayer(game, text) {
  if (game.state.pick) game.state.pick = pickRename(game.state.pick, text);
}
