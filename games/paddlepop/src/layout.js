import { CORNER, box } from "../../../kit/src/canvas/index.js";
import { TABLE } from "./table.js";

export { CORNER };

export const LIGHTS = 32;
const PAD = 8;
const GAP = 8;
const MOST = 560;
const SIDEWAYS_GAIN = 1.05;

export function barOf(width, height, { pause = true } = {}) {
  const row = height < 420 ? 48 : 56;
  const bar = box(PAD, PAD, width - 2 * PAD, row);
  const music = box(bar.x + bar.w - row, bar.y, row, row);
  const speaker = box(music.x - row, bar.y, row, row);
  const controls = { pause: pause ? box(speaker.x - row, bar.y, row, row) : null, speaker, music };
  const volume = box(Math.max(PAD, Math.min(width - PAD - 240, speaker.x + speaker.w / 2 - 120)), bar.y + bar.h + 6, 240, 64);
  return { bar, row, controls, volume };
}

function tableIn(width, room) {
  const upright = Math.min(room.w, (room.h - 2 * LIGHTS) / TABLE.length);
  const sideways = Math.min(room.h, (room.w - 2 * LIGHTS) / TABLE.length);
  const turn = sideways > upright * SIDEWAYS_GAIN;
  const s = Math.floor(Math.min(MOST, turn ? sideways : upright));
  const long = s * TABLE.length;
  if (turn) return { x: (width - long) / 2, y: room.y + (room.h - s) / 2, w: long, h: s, s, turn };
  return { x: (width - s) / 2, y: room.y + LIGHTS + (room.h - 2 * LIGHTS - long) / 2, w: s, h: long, s, turn };
}

function zonesOf(width, height, top, table) {
  if (table.turn) {
    const middle = table.x + table.w / 2;
    return [box(0, top, middle, height - top), box(middle, top, width - middle, height - top)];
  }
  const middle = table.y + table.h / 2;
  return [box(0, middle, width, height - middle), box(0, top, width, middle - top)];
}

export function playLayout(width, height, { fill = false, pause = true } = {}) {
  const bar = barOf(width, height, { pause });
  const top = bar.bar.y + bar.bar.h + GAP;
  const room = { y: top, w: width - 2 * PAD, h: height - PAD - top };
  const table = tableIn(width, room);
  return { width, height, fill, ...bar, table, zones: zonesOf(width, height, top, table) };
}

// u across the table (0–1), v along it, this phone's own end at v = TABLE.length
export function toScreen({ table }, u, v) {
  if (table.turn) return [table.x + (TABLE.length - v) * table.s, table.y + u * table.s];
  return [table.x + u * table.s, table.y + v * table.s];
}

export function acrossOf({ table }, { x, y }) {
  return table.turn ? (y - table.y) / table.s : (x - table.x) / table.s;
}

export function tableTransform(ctx, { table }) {
  if (table.turn) {
    ctx.translate(table.x + table.w, table.y);
    ctx.rotate(Math.PI / 2);
  } else ctx.translate(table.x, table.y);
}

export function playTargets(layout, { volume = false } = {}) {
  const { pause, speaker, music } = layout.controls;
  const targets = [
    ...(pause ? [{ kind: "pause", value: "pause", ...pause }] : []),
    { kind: "speaker", value: "speaker", ...speaker },
    { kind: "music", value: "music", ...music },
  ];
  return volume ? [{ kind: "volume", value: "volume", ...layout.volume }, ...targets] : targets;
}
