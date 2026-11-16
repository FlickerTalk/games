import { box } from "../../../kit/src/canvas/layout.js";
import { TALL, WIDE, wrapped } from "./arena.js";

export const TALLY = Object.freeze({ w: 96, h: 36 });
// an aircraft's box, in sky widths
export const CRAFT = 0.2;

const PAD = 8;
const GAP = 8;
const TURN = 88;

export function barOf(width, height) {
  const row = height < 420 ? 48 : 56;
  const bar = box(PAD, PAD, width - 2 * PAD, row);
  const music = box(bar.x + bar.w - row, bar.y, row, row);
  const speaker = box(music.x - row, bar.y, row, row);
  const pause = box(speaker.x - row, bar.y, row, row);
  const volume = box(Math.max(PAD, Math.min(width - PAD - 240, speaker.x + speaker.w / 2 - 120)), bar.y + bar.h + 6, 240, 64);
  return { bar, row, controls: { pause, speaker, music }, volume };
}

function fitted(room, side) {
  const [across, down] = side ? [TALL, WIDE] : [WIDE, TALL];
  const unit = Math.max(0, Math.min(room.w / across, room.h / down));
  const [w, h] = [across * unit, down * unit];
  return { x: room.x + (room.w - w) / 2, y: room.y + (room.h - h) / 2, w, h, unit, side };
}

function above(stage) {
  const room = box(stage.x, stage.y + TALLY.h + GAP, stage.w, stage.h - TALLY.h - GAP);
  return [false, true].map((side) => {
    const arena = fitted(room, side);
    const left = Math.max(stage.x, Math.min(arena.x, stage.x + stage.w / 2 - TALLY.w - GAP));
    const right = Math.min(stage.x + stage.w, Math.max(arena.x + arena.w, stage.x + stage.w / 2 + TALLY.w + GAP)) - TALLY.w;
    const y = arena.y - TALLY.h - GAP;
    return { arena, tallies: [box(left, y, TALLY.w, TALLY.h), box(right, y, TALLY.w, TALLY.h)] };
  });
}

function beside(stage) {
  const margin = TALLY.w + GAP;
  const room = box(stage.x + margin, stage.y, stage.w - 2 * margin, stage.h);
  if (room.w <= 0) return [];
  return [false, true].map((side) => {
    const arena = fitted(room, side);
    return { arena, tallies: [box(arena.x - margin, stage.y, TALLY.w, TALLY.h), box(arena.x + arena.w + GAP, stage.y, TALLY.w, TALLY.h)] };
  });
}

export function playLayout(width, height, { fill = false } = {}) {
  const bar = barOf(width, height);
  const top = bar.bar.y + bar.bar.h + GAP;
  const stage = box(PAD, top, width - 2 * PAD, height - PAD - top);
  const chosen = [...above(stage), ...beside(stage)].reduce((best, one) => (one.arena.unit > best.arena.unit * 1.02 ? one : best));
  const { arena } = chosen;
  const middle = arena.y + (arena.h - TURN) / 2;
  const turns = [box(arena.x + GAP, middle, TURN, TURN), box(arena.x + arena.w - GAP - TURN, middle, TURN, TURN)];
  return { width, height, fill, ...bar, stage, ...chosen, turns };
}

export function pointOf({ arena }, x, y) {
  const [u, v] = [wrapped(x, WIDE), wrapped(y, TALL)];
  return arena.side ? [arena.x + v * arena.unit, arena.y + (WIDE - u) * arena.unit] : [arena.x + u * arena.unit, arena.y + v * arena.unit];
}

export function skyAt({ arena }, point) {
  const across = Math.min(arena.w, Math.max(0, point.x - arena.x)) / arena.unit;
  const down = Math.min(arena.h, Math.max(0, point.y - arena.y)) / arena.unit;
  return arena.side ? { x: WIDE - down, y: across } : { x: across, y: down };
}

export const headingOn = ({ arena }, hx, hy) => (arena.side ? [hy, 0 - hx] : [hx, hy]);

export function playTargets(layout, { volume = false } = {}) {
  const { pause, speaker, music } = layout.controls;
  const targets = [
    { kind: "pause", value: "pause", ...pause },
    { kind: "speaker", value: "speaker", ...speaker },
    { kind: "music", value: "music", ...music },
    { kind: "steer", value: "left", ...layout.turns[0] },
    { kind: "steer", value: "right", ...layout.turns[1] },
  ];
  return volume ? [{ kind: "volume", value: "volume", ...layout.volume }, ...targets] : targets;
}
