import { pickLayout, pickPointer, pickRename, savePlayer, startPick } from "../../../kit/src/avatars/index.js";
import { LOOKS, PROGRESS } from "./levels.js";
import { beginRound } from "./rounds.js";
import { volumePointer } from "./touch.js";

const SHAKE_MS = 600;
const within = (area, { x, y }) => x >= area.x && x < area.x + area.w && y >= area.y && y < area.y + area.h;

export function pressTargets(game, event, onPress) {
  const { state } = game;
  const hit = game.targets().find((target) => within(target, event)) ?? null;
  if (event.type === "down") {
    state.press = hit && { kind: hit.kind, value: hit.value };
    return undefined;
  }
  if (event.type === "cancel") state.press = null;
  if (event.type !== "up") return undefined;
  const pressed = state.press;
  state.press = null;
  if (hit && pressed && hit.kind === pressed.kind && hit.value === pressed.value) onPress(hit);
  return undefined;
}

function chooseLook(game, index) {
  const { state } = game;
  const look = LOOKS[state.looks][index];
  if (!look) return;
  if (PROGRESS.owned(state.progress).includes(look)) {
    state.progress = PROGRESS.choose(state.progress, look);
    game.saveProgress();
    game.sound.play("tap");
    return;
  }
  state.moments.push({ kind: "shake", index, start: game.now(), duration: SHAKE_MS });
  game.sound.play("tap");
}

function leaveRound(game) {
  const { state } = game;
  state.paused = false;
  game.sound.pause(false);
  state.resume = state.snapshot;
  state.screen = "home";
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
  home: (game) => (game.state.screen === "play" ? leaveRound(game) : (game.state.screen = "home")),
  done: (game) => (game.state.screen = "home"),
  tab: (game, value) => (game.state.looks = value),
  look: (game, value) => chooseLook(game, value),
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
