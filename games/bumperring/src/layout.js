import { CORNER, box, within } from "../../../kit/src/canvas/layout.js";
import { FLOAT } from "./arena.js";

export { CORNER };

export const SQUASH = 0.58;
// a player's standing height, in platform radii
export const FIGURE = 0.5;

const PAD = 8;
const GAP = 8;
const MARGIN = 8;
const BOTTOM = 24;
const MOST = 240;
const SIDE_GAIN = 1.05;
const TIGHT = 300;
const FACING = 150;
const ABOVE = SQUASH + FIGURE * 1.2 + 0.02;
const BELOW = FLOAT * SQUASH + 0.36;
const ACROSS = FLOAT + 0.21;
const TALL = ABOVE + BELOW;

export function barOf(width, height) {
  const row = height < 420 ? 48 : 56;
  const bar = box(PAD, PAD, width - 2 * PAD, row);
  const music = box(bar.x + bar.w - row, bar.y, row, row);
  const speaker = box(music.x - row, bar.y, row, row);
  const pause = box(speaker.x - row, bar.y, row, row);
  const volume = box(Math.max(PAD, Math.min(width - PAD - 240, speaker.x + speaker.w / 2 - 120)), bar.y + bar.h + 6, 240, 64);
  return { bar, row, controls: { pause, speaker, music }, volume };
}

function upright(stage, size, pair) {
  const near = box(stage.x + (stage.w - size) / 2, stage.y + stage.h - BOTTOM - size, size, size);
  const far = box(near.x, stage.y + 4, size, size);
  const top = pair ? far.y + size + MARGIN : stage.y;
  const room = near.y - MARGIN - top;
  const r = Math.max(0, Math.min((stage.w - 2) / (2 * ACROSS), room / TALL, MOST));
  const platform = { x: stage.x + stage.w / 2, y: top + (room - TALL * r) / 2 + ABOVE * r, r };
  const zones = pair ? [box(stage.x, platform.y, stage.w, stage.y + stage.h - platform.y), box(stage.x, stage.y, stage.w, platform.y - stage.y)] : [stage];
  return { side: false, platform, dash: pair ? [near, far] : [near], zones };
}

function sideways(stage, size, pair, lowest) {
  const y = Math.max(stage.y, Math.min(stage.y + (stage.h - size) / 2, lowest - size));
  const near = box(stage.x + stage.w - MARGIN - size, y, size, size);
  const far = box(stage.x + MARGIN, y, size, size);
  const left = pair ? far.x + size + MARGIN : stage.x + PAD;
  const room = near.x - MARGIN - left;
  const r = Math.max(0, Math.min(room / (2 * ACROSS), (stage.h - PAD) / TALL, MOST));
  const platform = { x: left + room / 2, y: stage.y + (stage.h - TALL * r) / 2 + ABOVE * r, r };
  const zones = pair ? [box(platform.x, stage.y, stage.x + stage.w - platform.x, stage.h), box(stage.x, stage.y, platform.x - stage.x, stage.h)] : [stage];
  return { side: true, platform, dash: pair ? [near, far] : [near], zones };
}

export function playLayout(width, height, { fill = false, pair = false } = {}) {
  const bar = barOf(width, height);
  const top = bar.bar.y + bar.bar.h + GAP;
  const stage = box(0, top, width, height - top);
  const least = Math.min(stage.w, stage.h);
  const size = pair && least < TIGHT ? 88 : least >= 420 ? 128 : 120;
  const tall = upright(stage, size, pair);
  const wide = sideways(stage, size, pair, height - (fill ? CORNER : PAD));
  const facing = pair && tall.platform.r >= FACING;
  const chosen = !facing && wide.platform.r > tall.platform.r * SIDE_GAIN ? wide : tall;
  const shells = [{ x: stage.x + MARGIN + 43, y: stage.y + 22 }, { x: stage.x + stage.w - MARGIN - 43, y: stage.y + 22 }];
  return { width, height, fill, pair, ...bar, stage, shells, ...chosen };
}

export function sceneBox({ platform }) {
  const { x, y, r } = platform;
  return box(x - ACROSS * r, y - ABOVE * r, 2 * ACROSS * r, TALL * r);
}

// where a point of the round's platform is on this phone's screen; the far seat sees it turned round
export function footOf({ platform }, x, y, seat = 0) {
  const turn = seat === 0 ? 1 : -1;
  return [platform.x + turn * x * platform.r, platform.y + turn * y * platform.r * SQUASH];
}

export function seatAt(layout, point) {
  const found = layout.zones.findIndex((zone) => within(zone, point));
  return found < 0 ? null : found;
}

export function playTargets(layout, { volume = false } = {}) {
  const { pause, speaker, music } = layout.controls;
  const targets = [
    { kind: "pause", value: "pause", ...pause },
    { kind: "speaker", value: "speaker", ...speaker },
    { kind: "music", value: "music", ...music },
    ...layout.dash.map((area, at) => ({ kind: "dash", value: at, ...area })),
  ];
  return volume ? [{ kind: "volume", value: "volume", ...layout.volume }, ...targets] : targets;
}
