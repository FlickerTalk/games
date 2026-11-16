import { pickLayout, pickPointer, savePlayer } from "../../../kit/src/avatars/index.js";
import { pressTargets, volumePointer, within } from "../../../kit/src/canvas/index.js";
import { mayPick } from "./flow.js";
import { act } from "./menus.js";

const MISS_MS = 450;

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

function missedDie(game, event) {
  const { state } = game;
  if (event.type !== "down" || state.screen !== "play" || !state.round || mayPick(game, game.now())) return;
  const die = state.layout.dice.find((one) => within(one, event));
  if (!die || state.round.race.winner !== null) return;
  state.moments.push({ kind: "miss", die: die.value, start: game.now(), duration: MISS_MS });
  game.sound.play("error-soft");
}

export function pointerOf(game, event) {
  const { state } = game;
  if (state.screen === "avatar") return avatarPointer(game, event);
  const press = (target) => act(game, target);
  if (state.paused) return pressTargets(state, game.targets(), event, press);
  if (volumePointer(state, event, { volume: state.layout?.volume, controls: game.controls, targets: game.targets(), now: game.now, sync: game.syncSound })) return undefined;
  missedDie(game, event);
  return pressTargets(state, game.targets(), event, press);
}
