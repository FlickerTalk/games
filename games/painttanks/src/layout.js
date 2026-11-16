import { CORNER, barLayout, box } from "../../../kit/src/canvas/index.js";
import { WORLD } from "./world.js";

const PAD = 8;
const DIAL = 88;
const FIRE = 120;
const SMALL_FIRE = 88;
const ROOMY = 520;

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

export function playLayout(width, height, { fill = false, practice = false } = {}) {
  const top = barLayout(width, height, { rival: !practice });
  const start = top.bar.y + top.bar.h + top.gap;
  const scale = Math.min(width / WORLD.width, (height - start) / WORLD.height);
  const view = { x: (width - WORLD.width * scale) / 2, y: height - WORLD.height * scale, scale, mirror: false };
  const fire = height >= ROOMY ? FIRE : SMALL_FIRE;
  const bottom = height - (fill ? CORNER : PAD);
  return {
    width,
    height,
    fill,
    ...top,
    start,
    view,
    angle: box(PAD, start, DIAL, DIAL),
    power: box(width - PAD - DIAL, start, DIAL, DIAL),
    dive: box((width - DIAL) / 2, start, DIAL, DIAL),
    fire: box((width - fire) / 2, bottom - fire, fire, fire),
  };
}

export function playTargets(layout, { volume = false, sub = false } = {}) {
  const { pause, speaker, music } = layout.controls;
  const bar = [
    { kind: "pause", value: "pause", ...pause },
    { kind: "speaker", value: "speaker", ...speaker },
    { kind: "music", value: "music", ...music },
  ];
  const dials = volume ? [] : [{ kind: "angle", value: "angle", ...layout.angle }, { kind: "power", value: "power", ...layout.power }];
  const dive = sub ? [{ kind: "dive", value: "dive", ...layout.dive }] : [];
  const fire = [{ kind: "fire", value: "fire", ...layout.fire }];
  return volume ? [{ kind: "volume", value: "volume", ...layout.volume }, ...bar, ...dials, ...dive, ...fire] : [...bar, ...dials, ...dive, ...fire];
}
