import { within } from "../../../kit/src/canvas/index.js";
import { aimFromPull, anchorOf } from "./aim.js";
import { familyOfSide, fire, isMyTurn, latestOf } from "./battle.js";
import { toWorld } from "./layout.js";
import { act, pressTargets, volumePointer } from "./menus.js";

const DIALS = ["angle", "power"];

function aimTo(game, event) {
  const { round, layout } = game.state;
  const state = latestOf(round);
  const view = { ...layout.view, mirror: round.mySide === 1 };
  const [x, y] = toWorld(view, event.x, event.y);
  const torpedo = round.torpedo && familyOfSide(round, round.mySide) === "sub";
  const aim = aimFromPull(anchorOf(state, round.mySide), { x, y }, { side: round.mySide, torpedo });
  round.pull = { x: event.x, y: event.y, short: aim.short };
  if (!aim.short) round.aim = { angle: aim.angle, power: aim.power };
}

function pulling(game, event) {
  const { round } = game.state;
  if (event.type === "move") aimTo(game, event);
  if (event.type === "cancel") round.pull = null;
  if (event.type !== "up") return;
  aimTo(game, event);
  const { short } = round.pull;
  round.pull = null;
  if (!short) fire(game);
}

function dialPress(game, event) {
  const { state } = game;
  if (event.type === "down") {
    const hit = game.targets().find((one) => DIALS.includes(one.kind) && within(one, event));
    state.dial = hit ? { kind: hit.kind, way: event.y < hit.y + hit.h / 2 ? 1 : -1 } : null;
    return false;
  }
  const kept = state.dial;
  if (event.type !== "up" || !kept) return false;
  state.dial = null;
  const hit = game.targets().find((one) => one.kind === kept.kind && within(one, event));
  if (hit) act(game, hit, kept.way);
  state.press = null;
  return Boolean(hit);
}

export function playPointer(game, event) {
  const { state } = game;
  const { round } = state;
  if (state.paused) return pressTargets(game, event, (target) => act(game, target));
  if (round?.pull) return pulling(game, event);
  if (volumePointer(game, event)) return undefined;
  const onTarget = game.targets().some((one) => within(one, event));
  if (event.type === "down" && !onTarget) {
    if (isMyTurn(game)) {
      aimTo(game, event);
      game.sound.play("pick");
    }
    return undefined;
  }
  if (dialPress(game, event)) return undefined;
  return pressTargets(game, event, (target) => !DIALS.includes(target.kind) && act(game, target));
}
