import { CORNER, barLayout, box, within } from "../../../kit/src/canvas/index.js";

// shares of a knight's height
export const BALLOON_LIFT = 1.12;
export const SIGNAL_LIFT = 1.52;
// how far the bell's rays reach, in signal sizes
export const SIGNAL_REACH = 0.61;

const PAD = 8;
const GAP = 8;
const MOST = 720;
const SIDE_ROOM = 170;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

function padsBelow(stage, bottom, pair) {
  const size = clamp(stage.h * 0.2, 120, 136);
  const y = bottom - size;
  const pads = pair ? [0.25, 0.75].map((share) => box(stage.x + stage.w * share - size / 2, y, size, size)) : [box(stage.x + (stage.w - size) / 2, y, size, size)];
  return { pads, yard: box(stage.x, stage.y, stage.w, y - GAP - stage.y) };
}

function padsBeside(stage, bottom, pair) {
  const size = 120;
  const y = Math.min(stage.y + (stage.h - size) / 2, bottom - size);
  const right = box(stage.x + stage.w - size, y, size, size);
  const left = pair ? size + GAP : 0;
  const pads = pair ? [box(stage.x, y, size, size), right] : [right];
  return { pads, yard: box(stage.x + left, stage.y, stage.w - left - size - GAP, stage.h - 4) };
}

function placed(stage, fill, pair) {
  const bottom = stage.y + stage.h - (fill ? CORNER - PAD : 0);
  const short = stage.h < 400 || stage.w > stage.h * 1.6;
  const taken = (pair ? 2 : 1) * (120 + GAP);
  return short && stage.w - taken >= SIDE_ROOM ? padsBeside(stage, bottom, pair) : padsBelow(stage, bottom, pair);
}

function duelIn(yard) {
  const size = clamp(Math.min(yard.w * 0.45, yard.h / 2.05, 150), 64, 150);
  const spread = Math.min(yard.w * 0.26, size * 0.95);
  const middle = yard.x + yard.w / 2;
  const ground = yard.y + yard.h - 6;
  const signal = { x: middle, size: clamp(size * 0.62, 44, 96) };
  signal.y = Math.max(yard.y + signal.size * SIGNAL_REACH, ground - size * SIGNAL_LIFT);
  return { size, ground, knights: [{ x: middle - spread, y: ground }, { x: middle + spread, y: ground }], signal };
}

export function playLayout(width, height, { fill = false, pair = false } = {}) {
  const bar = barLayout(width, height, { rival: true });
  const top = bar.bar.y + bar.bar.h + GAP;
  const wide = Math.min(width - 2 * PAD, MOST);
  const stage = box((width - wide) / 2, top, wide, height - PAD - top);
  const { pads, yard } = placed(stage, fill, pair);
  const half = stage.w / 2;
  const zones = pair ? [box(stage.x, stage.y, half, stage.h), box(stage.x + half, stage.y, half, stage.h)] : [stage];
  const ribbon = bar.bar.h > bar.row ? bar.progress : box(bar.bar.x + 14, bar.bar.y + bar.bar.h - 6, bar.bar.w - 28, 4);
  return { width, height, fill, pair, ...bar, ribbon, stage, yard, pads, zones, ...duelIn(yard) };
}

export function seatAt({ zones }, point) {
  const seat = zones.findIndex((zone) => within(zone, point));
  return seat < 0 ? null : seat;
}

export function playTargets(layout, { volume = false } = {}) {
  const { pause, speaker, music } = layout.controls;
  const targets = [
    ...layout.pads.map((pad, seat) => ({ kind: "strike", value: seat, ...pad })),
    { kind: "pause", value: "pause", ...pause },
    { kind: "speaker", value: "speaker", ...speaker },
    { kind: "music", value: "music", ...music },
  ];
  return volume ? [{ kind: "volume", value: "volume", ...layout.volume }, ...targets] : targets;
}
