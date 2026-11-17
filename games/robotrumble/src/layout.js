import { CORNER, box } from "../../../kit/src/canvas/index.js";

export { CORNER };

const PAD = 8;
const GAP = 8;
const HUD = 58;
const MOST = 175;
const BUTTONS = [120, 88];
const CELLS_WIDE = 139;
const TALL = 1.3;
const HALF = 0.45;
export const HOME = 1.5;
export const MEET = 1.04;

export function barOf(width, height, { pause = true } = {}) {
  const row = height < 420 ? 48 : 56;
  const bar = box(PAD, PAD, width - 2 * PAD, row);
  const music = box(bar.x + bar.w - row, bar.y, row, row);
  const speaker = box(music.x - row, bar.y, row, row);
  const controls = { pause: pause ? box(speaker.x - row, bar.y, row, row) : null, speaker, music };
  const volume = box(Math.max(PAD, Math.min(width - PAD - 240, speaker.x + speaker.w / 2 - 120)), bar.y + bar.h + 6, 240, 64);
  return { bar, row, controls, volume };
}

function hudOf(width, top, inset) {
  const edge = PAD + inset;
  const scale = Math.min(1, (width - 2 * edge - 56) / 2 / CELLS_WIDE);
  const side = (seat) => ({ x: seat === 0 ? edge + 2 : width - edge - 2, lamps: top + 12, cells: top + 26, direction: seat === 0 ? 1 : -1 });
  return { area: box(edge, top, width - 2 * edge, HUD - 6), scale, sides: [side(0), side(1)], dial: { x: width / 2, y: top + 27, r: 22 } };
}

function column(x, y, size, seat, pair) {
  const glove = { kind: "glove", value: seat, ...box(x, y, size, size) };
  return pair ? [glove, { kind: "boot", value: seat, ...box(x, y + size + GAP, size, size) }] : [glove];
}

function buttonsAt(width, y, size, pair) {
  const [left, right] = [PAD, width - PAD - size];
  if (pair) return [...column(left, y, size, 0, true), ...column(right, y, size, 1, true)];
  return [...column(left, y, size, 0, false), { kind: "boot", value: 0, ...box(right, y, size, size) }];
}

function below(width, height, { top, bottom, pair }, size) {
  const band = pair ? 2 * size + GAP : size;
  const y = bottom - band;
  const ground = y - GAP - 4;
  const robot = Math.min(MOST, width * 0.36, (ground - top - HUD) / TALL);
  return { flank: false, inset: 0, robot, ground, buttons: buttonsAt(width, y, size, pair) };
}

function flank(width, height, { top, bottom, pair }, size) {
  const band = pair ? 2 * size + GAP : size;
  const ground = height - PAD - 20;
  const inner = width - 2 * (PAD + size + GAP);
  const under = bottom - band >= top + HUD;
  const robot = bottom - band >= top ? Math.min(MOST, inner / (HOME + 2 * HALF), (ground - top - HUD) / TALL) : 0;
  return { flank: true, inset: under ? 0 : size + GAP, robot, ground, buttons: buttonsAt(width, bottom - band, size, pair) };
}

function roomiest(width, height, frame) {
  let best = null;
  for (const size of BUTTONS) {
    for (const place of [below, flank]) {
      const found = place(width, height, frame, size);
      if (!best || found.robot > best.robot + 0.5) best = found;
    }
  }
  return best;
}

export function playLayout(width, height, { fill = false, pair = false, pause = true } = {}) {
  const bar = barOf(width, height, { pause });
  const top = bar.bar.y + bar.bar.h + GAP;
  const bottom = height - (fill ? CORNER : PAD);
  const { robot, ground, buttons, inset, flank: beside } = roomiest(width, height, { top, bottom, pair });
  const size = Math.floor(robot);
  const middle = width / 2;
  return {
    width, height, fill, pair, ...bar, flank: beside, size, ground,
    stage: box(0, top - GAP / 2, width, height - top + GAP / 2),
    home: [middle - (HOME * size) / 2, middle + (HOME * size) / 2],
    meet: [middle - (MEET * size) / 2, middle + (MEET * size) / 2],
    hud: hudOf(width, top, inset),
    buttons,
  };
}

export function robotsBox({ home, size, ground }) {
  return box(home[0] - HALF * size, ground - TALL * size, home[1] - home[0] + 2 * HALF * size, TALL * size);
}

export function playTargets(layout, { volume = false } = {}) {
  const { pause, speaker, music } = layout.controls;
  const targets = [
    ...(pause ? [{ kind: "pause", value: "pause", ...pause }] : []),
    { kind: "speaker", value: "speaker", ...speaker },
    { kind: "music", value: "music", ...music },
    ...layout.buttons,
  ];
  return volume ? [{ kind: "volume", value: "volume", ...layout.volume }, ...targets] : targets;
}
