import { pressTargets, within } from "../../../kit/src/canvas/index.js";
import { muzzleOf } from "./layout.js";
import { act, soundPointer } from "./menus.js";
import { seenOf } from "./rounds.js";
import { fire, loose } from "./shots.js";

const SOUNDS = { popgun: "tick", blaster: "splash", bow: "whoosh" };

function shot(game, made) {
  const { state } = game;
  if (!made) return;
  const { kind } = state.round.tool;
  game.sound.play(SOUNDS[kind], { gain: 0.7 });
  if (state.taught.includes(kind)) return;
  state.taught = [...state.taught, kind];
  game.saveOwn();
}

function playable(game) {
  const { round, paused } = game.state;
  return !paused && game.now() >= round.startAt && round.step < round.roundSteps && !round.sent && round.heard?.p !== 1;
}

function shoot(game, event, id) {
  const { round, layout } = game.state;
  if (round.tool.kind === "bow") round.pull = { id, x0: event.x, y0: event.y, x: event.x, y: event.y };
  else shot(game, fire(round.tool, { step: round.step, from: muzzleOf(layout), at: event, seen: seenOf(round, layout), unit: layout.unit }));
}

function pulling(game, event) {
  const { round, layout } = game.state;
  const { pull } = round;
  if (event.type === "move" || event.type === "up") Object.assign(pull, { x: event.x, y: event.y });
  if (event.type === "up" && playable(game)) shot(game, loose(round.tool, { step: round.step, from: muzzleOf(layout), pull: { dx: pull.x - pull.x0, dy: pull.y - pull.y0 }, unit: layout.unit }));
  if (event.type === "up" || event.type === "cancel") round.pull = null;
}

export function playPointer(game, event) {
  const { state } = game;
  const { round, layout } = state;
  const press = (target) => act(game, target);
  if (state.paused || !round) return pressTargets(state, game.targets(), event, press);
  if (soundPointer(game, event)) return undefined;
  const id = event.id ?? 0;
  if (round.pull?.id === id) return pulling(game, event);
  if (event.type === "down" && within(layout.stage, event) && !game.targets().some((one) => within(one, event))) {
    if (playable(game)) shoot(game, event, id);
    return undefined;
  }
  return pressTargets(state, game.targets(), event, press);
}
