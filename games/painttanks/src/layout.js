import { CORNER, barLayout, box } from "../../../kit/src/canvas/index.js";
import { WORLD } from "./world.js";

const PAD = 8;
const DIAL = 88;
const FIRE = 120;
const SMALL_FIRE = 88;
const ROOMY = 520;
const WIDE = 700;
const FLAG = 44;

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

function controlRow(width, height, start, fill) {
  const tall = height >= ROOMY;
  const pad = Math.max(0, Math.min(PAD, (width - 4 * DIAL) / 5));
  const big = tall ? FIRE : SMALL_FIRE;
  const wide = width >= WIDE;
  const angle = box(pad, start, DIAL, DIAL);
  const power = box(width - pad - DIAL, start, DIAL, DIAL);
  if (wide) {
    const fire = box(power.x - pad - big, start, big, big);
    return { angle, power, fire, sub: { fire, dive: box(angle.x + DIAL + pad, start, DIAL, DIAL) } };
  }
  const fire = box((width - big) / 2, start, big, big);
  if (width < 4 * DIAL) {
    const low = box((width - DIAL) / 2, height - (fill ? CORNER : PAD) - DIAL, DIAL, DIAL);
    return { angle, power, fire, sub: { fire: low, dive: box((width - DIAL) / 2, start, DIAL, DIAL) } };
  }
  return {
    angle,
    power,
    fire,
    sub: { fire: box(width / 2 + pad / 2, start, DIAL, DIAL), dive: box(width / 2 - pad / 2 - DIAL, start, DIAL, DIAL) },
  };
}

export function playLayout(width, height, { fill = false, practice = false } = {}) {
  const top = barLayout(width, height, { rival: !practice });
  const start = top.bar.y + top.bar.h + top.gap;
  const scale = Math.min(width / WORLD.width, (height - start) / WORLD.height);
  const view = { x: (width - WORLD.width * scale) / 2, y: height - WORLD.height * scale, scale, mirror: false };
  const row = controlRow(width, height, start, fill);
  const flag = { x: width >= WIDE ? width / 2 : row.fire.x + row.fire.w / 2, y: row.fire.y + row.fire.h + FLAG + 14, size: FLAG };
  return { width, height, ...top, start, view, ...row, flag };
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
