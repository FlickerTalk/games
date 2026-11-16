import { pickLayout, pickPointer, pickRename, savePlayer, startPick } from "../../../kit/src/avatars/index.js";
import { chooseLook, pressTargets as pressCanvas, volumePointer as volumeCanvas } from "../../../kit/src/canvas/index.js";
import { stepAim } from "./aim.js";
import { againRound, beginRound, familyOfSide, fire as shoot, roundKey } from "./battle.js";
import { LOOKS, PROGRESS } from "./levels.js";

const SHAKE_MS = 600;
const KINDS = Object.keys(LOOKS);

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
  const { round } = state;
  state.resume = round && round.mode !== "friend" ? { v: 1, mode: round.mode, field: round.field, mySide: round.mySide, moves: round.moves } : null;
  state.screen = "home";
  game.run(() => game.store?.set(roundKey(state), JSON.stringify(state.resume)));
}

function dial(game, kind, way = 1) {
  const { round } = game.state;
  if (!round) return;
  const torpedo = kind === "angle" && round.torpedo;
  round.aim = stepAim(round.aim, kind, way, { torpedo });
  game.sound.play("tick");
}

function seat(game) {
  const { state } = game;
  state.practice = !state.practice;
  game.saveOwn();
  game.sound.play("tap");
  if (state.mode === "friend" && !state.practice && game.duel && !game.duel.status.here) game.run(() => game.duel.retry());
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
  again: (game) => game.run(() => againRound(game)),
  variant(game, value) {
    game.state.variant = value;
    game.saveOwn();
    game.sound.play("tap");
  },
  avatar(game) {
    game.state.pick = startPick(game.state.player);
    game.state.screen = "avatar";
  },
  looks(game) {
    game.state.looks = null;
    game.state.screen = "looks";
  },
  look(game, value) {
    if (game.state.looks) pickLook(game, value);
    else game.state.looks = KINDS[value] ?? null;
  },
  done(game) {
    if (game.state.screen === "looks" && game.state.looks) game.state.looks = null;
    else game.state.screen = "home";
  },
  rival: seat,
  home: (game) => (game.state.screen === "play" ? leaveRound(game) : (game.state.screen = "home")),
  gift(game) {
    game.state.outcome.opened = true;
    game.sound.play("star");
  },
  accept: (game) => game.run(() => game.duel.accept()),
  dismiss: (game) => game.duel.dismiss(),
  angle: (game, value, way) => dial(game, "angle", way),
  power: (game, value, way) => dial(game, "power", way),
  fire(game) {
    if (!shoot(game)) game.sound.play("error-soft");
  },
  dive(game) {
    const { round } = game.state;
    if (!round || familyOfSide(round, round.mySide) !== "sub") return;
    round.torpedo = !round.torpedo;
    round.aim = { ...round.aim, angle: round.torpedo ? Math.min(45, round.aim.angle) : Math.max(5, round.aim.angle) };
    game.sound.play("whoosh");
  },
};

export function act(game, target, way) {
  ACTIONS[target.kind]?.(game, target.value, way);
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

export function menuPointer(game, event) {
  if (game.state.screen === "avatar") return avatarPointer(game, event);
  if (volumePointer(game, event)) return undefined;
  return pressTargets(game, event, (target) => act(game, target));
}

export function renamePlayer(game, text) {
  if (game.state.pick) game.state.pick = pickRename(game.state.pick, text);
}
