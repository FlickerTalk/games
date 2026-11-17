import { barLayout, box } from "../../../kit/src/canvas/index.js";

const PAD = 8;
const GAP = 8;
const MOST = 640;
const SHAPE = 1.3;
const PART = 32;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

export function playLayout(width, height, { fill = false, pause = true } = {}) {
  const bar = barLayout(width, height, { rival: true, pause });
  const top = bar.bar.y + bar.bar.h + GAP;
  const wide = Math.min(width - 2 * PAD, MOST);
  const field = box((width - wide) / 2, top, wide, height - PAD - top);
  const unit = Math.min(field.w, Math.sqrt((field.w * field.h) / SHAPE));
  const tall = bar.bar.h > bar.row;
  const me = tall ? { x: bar.bar.x + 14 + PART / 2, y: bar.rival.y, size: PART } : null;
  const start = me ? me.x + PART / 2 + 54 : bar.progress.x;
  const ribbon = tall ? box(start, bar.progress.y, bar.progress.x + bar.progress.w - start, bar.progress.h) : box(bar.bar.x + 14, bar.bar.y + bar.bar.h - 6, bar.bar.w - 28, 4);
  return { width, height, fill, ...bar, me, ribbon, field, unit, craft: clamp(Math.min(unit * 0.21, field.h * 0.23), 56, 96) };
}

export const toScreen = ({ field }, u, v) => [field.x + u * field.w, field.y + v * field.h];

export const fromScreen = ({ field }, { x, y }) => ({ u: (x - field.x) / field.w, v: (y - field.y) / field.h });

export const metricsOf = ({ field, unit, craft }) => ({ w: field.w, h: field.h, unit, craft });

export function playTargets(layout, { volume = false } = {}) {
  const { pause, speaker, music } = layout.controls;
  const targets = [
    ...(pause ? [{ kind: "pause", value: "pause", ...pause }] : []),
    { kind: "speaker", value: "speaker", ...speaker },
    { kind: "music", value: "music", ...music },
  ];
  return volume ? [{ kind: "volume", value: "volume", ...layout.volume }, ...targets] : targets;
}
