import { lineValue } from "../../../kit/src/sound/index.js";
import { cancelDrag, dropDrag, liftPiece, moveDrag } from "./drag.js";
import { act, pressTargets } from "./menus.js";
import { layPiece } from "./rounds.js";
import { variantOf } from "./variants.js";

const BOUNCE_MS = 450;
const within = (area, { x, y }) => x >= area.x && x < area.x + area.w && y >= area.y && y < area.y + area.h;

function slide(game, { x }) {
  const { volume } = game.state.layout;
  game.controls.slide(lineValue(x, volume.x + 24, volume.x + volume.w - 24));
  game.state.volumeAt = game.now();
  game.syncSound();
}

export function volumePointer(game, event) {
  const { state } = game;
  if (state.press?.kind === "volume") {
    if (event.type === "move") slide(game, event);
    if (event.type === "up" || event.type === "cancel") {
      if (event.type === "up") slide(game, event);
      game.controls.release();
      state.press = null;
      game.syncSound();
    }
    return true;
  }
  if (event.type !== "down" || !state.sound.open || !state.layout) return false;
  if (within(state.layout.volume, event)) {
    state.press = { kind: "volume" };
    slide(game, event);
    return true;
  }
  const speaker = game.targets().find((one) => one.kind === "speaker");
  if (!speaker || !within(speaker, event)) {
    game.controls.fold();
    game.syncSound();
  }
  return false;
}

function field(state) {
  const { layout, round } = state;
  return { court: layout.court, cells: round.court.cells, lift: layout.lift, beds: variantOf(round.variant).beds };
}

function sendBack(game, back) {
  const { state } = game;
  const now = game.now();
  state.moments.push({ kind: "bounce", piece: back.piece, slot: back.slot, from: [back.point.x, back.point.y - state.layout.lift], start: now, duration: BOUNCE_MS });
  state.returning = { slot: back.slot, until: now + BOUNCE_MS };
  game.sound.play("bounce");
}

function lift(game, event) {
  const { state } = game;
  const { round } = state;
  if (!round || round.over || state.endAt !== null) return false;
  const slot = state.layout.slots.findIndex((zone) => within(zone, event));
  const id = slot >= 0 ? round.slots[slot] : null;
  if (!id || state.returning?.slot === slot) return false;
  state.drag = moveDrag(liftPiece(slot, id, { x: event.x, y: event.y }), { x: event.x, y: event.y }, field(state));
  state.finger = event.id ?? null;
  game.sound.play("pick");
  return true;
}

function carry(game, event) {
  const { state } = game;
  if ((event.id ?? null) !== state.finger) return;
  const point = { x: event.x, y: event.y };
  if (event.type === "move") {
    state.drag = moveDrag(state.drag, point, field(state));
    return;
  }
  const moved = event.type === "up" ? moveDrag(state.drag, point, field(state)) : state.drag;
  const ended = event.type === "up" ? dropDrag(moved) : cancelDrag(moved);
  state.drag = ended.drag;
  if (ended.place && layPiece(game, ended.place.slot, ended.place.at)) return;
  if (ended.place) sendBack(game, { slot: ended.place.slot, piece: moved.piece, point });
  if (ended.back) sendBack(game, ended.back);
}

export function playPointer(game, event) {
  const { state } = game;
  if (state.paused) return pressTargets(game, event, (target) => act(game, target));
  if (state.drag.phase === "lifted") {
    if (event.type !== "down") carry(game, event);
    return undefined;
  }
  if (volumePointer(game, event)) return undefined;
  if (event.type === "down" && !game.targets().some((one) => one.kind !== "slot" && within(one, event)) && lift(game, event)) return undefined;
  return pressTargets(game, event, (target) => target.kind !== "slot" && act(game, target));
}
