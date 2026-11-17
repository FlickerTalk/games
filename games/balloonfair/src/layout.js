import { barLayout, box } from "../../../kit/src/canvas/index.js";
import { KINDS } from "./fair.js";

const PAD = 8;
const GAP = 8;
const MOST = 640;
const SHAPE = 1.3;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

export function playLayout(width, height, { fill = false, rival = false, pause = true } = {}) {
  const bar = barLayout(width, height, { rival, pause });
  const top = bar.bar.y + bar.bar.h + GAP;
  const wide = Math.min(width - 2 * PAD, MOST);
  const stage = box((width - wide) / 2, top, wide, height - PAD - top);
  const awning = clamp(stage.h * 0.09, 24, 60);
  const counter = clamp(stage.h * 0.17, 52, 112);
  const field = box(stage.x, stage.y + awning * 0.6, stage.w, stage.h - awning * 0.6 - counter);
  const size = Math.min(122, counter * 1.08);
  const tool = { x: stage.x + stage.w / 2, y: stage.y + stage.h - size / 2, size };
  const ribbon = bar.bar.h > bar.row ? bar.progress : box(bar.bar.x + 14, bar.bar.y + bar.bar.h - 6, bar.bar.w - 28, 4);
  return { width, height, fill, ...bar, ribbon, stage, field, awning, counter, tool, unit: Math.min(field.w, Math.sqrt((field.w * field.h) / SHAPE)) };
}

export const toScreen = ({ field }, u, v) => [field.x + u * field.w, field.y + v * field.h];

export const fromScreen = ({ field }, { x, y }) => ({ u: (x - field.x) / field.w, v: (y - field.y) / field.h });

export const sizeOf = (layout, kind) => KINDS[kind].size * layout.unit;

export function playTargets(layout, { volume = false } = {}) {
  const { pause, speaker, music } = layout.controls;
  const targets = [
    ...(pause ? [{ kind: "pause", value: "pause", ...pause }] : []),
    { kind: "speaker", value: "speaker", ...speaker },
    { kind: "music", value: "music", ...music },
  ];
  return volume ? [{ kind: "volume", value: "volume", ...layout.volume }, ...targets] : targets;
}

export const muzzleOf = ({ tool }) => ({ x: tool.x, y: tool.y - tool.size * 0.3 });
