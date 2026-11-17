import { CORNER, barLayout, box } from "../../../kit/src/canvas/index.js";
import { WORLD } from "./world.js";

const PAD = 8;
const DIAL = 88;
const FIRE = 120;
const SMALL_FIRE = 88;
const ROOMY = 520;
const WIDE = 700;
const FLAG = 44;
const SKY = 0.2;
const SMALLEST_FIELD = 0.8;

export function toScreen(view, x, y) {
  return [view.x + (view.mirror ? WORLD.width - x : x) * view.scale, view.y + y * view.scale];
}

export function toWorld(view, x, y) {
  const local = (x - view.x) / view.scale;
  return [view.mirror ? WORLD.width - local : local, (y - view.y) / view.scale];
}

export function visibleWorld(view, width, height) {
  const [one] = toWorld(view, 0, 0);
  const [two] = toWorld(view, width, 0);
  return { left: Math.min(one, two), right: Math.max(one, two), top: -view.y / view.scale, bottom: (height - view.y) / view.scale };
}

function dials(width, y) {
  const pad = Math.max(0, Math.min(PAD, (width - 4 * DIAL) / 5));
  return { pad, angle: box(pad, y, DIAL, DIAL), power: box(width - pad - DIAL, y, DIAL, DIAL) };
}

function wideRow(width, height, start) {
  const { pad, angle, power } = dials(width, start);
  const big = height >= ROOMY ? FIRE : SMALL_FIRE;
  const fire = box(power.x - pad - big, start, big, big);
  return { angle, power, fire, sub: { fire, dive: box(angle.x + DIAL + pad, start, DIAL, DIAL) } };
}

function underField(width, height, start, fill) {
  const full = width / WORLD.width;
  const foot = height - (fill ? CORNER : PAD) - FIRE - PAD;
  if (foot - WORLD.height * full * (1 - SKY) >= start + DIAL) return { scale: full, foot, fire: FIRE };
  if (fill) return null;
  const low = height - PAD - SMALL_FIRE - PAD;
  const scale = (low - start - DIAL) / (WORLD.height * (1 - SKY));
  return scale >= full * SMALLEST_FIELD ? { scale, foot: low, fire: SMALL_FIRE } : null;
}

function belowField(width, height, start, fill) {
  const y = height - (fill ? CORNER : PAD) - DIAL;
  const { pad, angle, power } = dials(width, y);
  const scale = Math.min(width / WORLD.width, (y - PAD - start) / WORLD.height);
  const view = { x: (width - WORLD.width * scale) / 2, y: y - PAD - WORLD.height * scale, scale, mirror: false };
  const fire = box((width - DIAL) / 2, y, DIAL, DIAL);
  const sub = width < 4 * DIAL ? { fire, dive: box((width - DIAL) / 2, start, DIAL, DIAL) } : { fire: box(width / 2 + pad / 2, y, DIAL, DIAL), dive: box(width / 2 - pad / 2 - DIAL, y, DIAL, DIAL) };
  return { view, angle, power, fire, sub };
}

export function playLayout(width, height, { fill = false, practice = false } = {}) {
  const top = barLayout(width, height, { rival: !practice });
  const start = top.bar.y + top.bar.h + top.gap;
  if (width >= WIDE) {
    const row = wideRow(width, height, start);
    const scale = Math.min(width / WORLD.width, (height - start) / WORLD.height);
    const view = { x: (width - WORLD.width * scale) / 2, y: height - WORLD.height * scale, scale, mirror: false };
    return { width, height, ...top, start, view, ...row, flag: { x: row.fire.x + row.fire.w / 2, y: Math.max(row.fire.y + row.fire.h, start + DIAL) + FLAG + 14, size: FLAG } };
  }
  const flag = { x: width * 0.34, y: start + DIAL + FLAG + 14, size: FLAG };
  const under = underField(width, height, start, fill);
  if (!under) return { width, height, ...top, start, ...belowField(width, height, start, fill), flag };
  const fire = box((width - under.fire) / 2, under.foot + PAD, under.fire, under.fire);
  const view = { x: (width - WORLD.width * under.scale) / 2, y: under.foot - WORLD.height * under.scale, scale: under.scale, mirror: false };
  const { angle, power } = dials(width, start);
  return { width, height, ...top, start, view, angle, power, fire, sub: { fire, dive: box((width - DIAL) / 2, start, DIAL, DIAL) }, flag };
}

export const controlsOf = (layout, sub) => (sub ? { angle: layout.angle, power: layout.power, ...layout.sub } : { angle: layout.angle, power: layout.power, fire: layout.fire, dive: null });

export function playTargets(layout, { volume = false, sub = false } = {}) {
  const { pause, speaker, music } = layout.controls;
  const bar = [
    { kind: "pause", value: "pause", ...pause },
    { kind: "speaker", value: "speaker", ...speaker },
    { kind: "music", value: "music", ...music },
  ];
  if (volume) return [{ kind: "volume", value: "volume", ...layout.volume }, ...bar];
  const { angle, power, fire, dive } = controlsOf(layout, sub);
  const aim = [{ kind: "angle", value: "angle", ...angle }, { kind: "power", value: "power", ...power }];
  return [...bar, ...aim, ...(dive ? [{ kind: "dive", value: "dive", ...dive }] : []), { kind: "fire", value: "fire", ...fire }];
}
