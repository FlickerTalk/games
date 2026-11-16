import { barLayout } from "../../../kit/src/canvas/bar.js";
import { CORNER, box, target } from "../../../kit/src/canvas/layout.js";
import { HOOK_X } from "./round.js";

const PAD = 12;
const TILE = 88;

export const HOME_TILES = Object.freeze(["album"]);
export const TABS = Object.freeze(["charm", "place"]);

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

function anglerSize(width, stage, least) {
  return Math.min(clamp(width * 0.24, least, 150), (stage * 0.38 - 6) / 1.2);
}

function albumBadge(top, rival) {
  const { bar, row, controls } = top;
  const left = controls.pause.x - 8 - 48;
  if (left < bar.x + 120 || (rival && !(bar.h > row))) return null;
  return box(left, bar.y + 4, 48, row - 8);
}

export function sceneLayout(area, { least = 40 } = {}) {
  const size = anglerSize(area.w, area.h, least);
  const horizon = Math.round(area.y + size * 1.2 + Math.max(6, area.h * 0.04));
  const deck = horizon - size * 0.12;
  const bottom = area.y + area.h;
  const floorHeight = clamp((bottom - horizon) * 0.1, Math.min(26, (bottom - horizon) * 0.2), 45);
  const hooks = HOOK_X.map((share) => area.x + share * area.w);
  const seat = Math.max(size * 0.62, hooks[0] - area.x - size);
  const bucketSize = clamp(size * 0.62, 28, 80);
  return {
    size, horizon, deck, hooks,
    fish: Math.round(clamp(Math.min(area.w * 0.17, (bottom - horizon) * 0.16), 34, 88)),
    sky: box(area.x, area.y, area.w, horizon - area.y),
    water: box(area.x, horizon, area.w, bottom - horizon),
    floor: box(area.x, bottom - floorHeight, area.w, floorHeight),
    pier: { x: Math.round(area.x + area.w * 0.02), y: deck, w: Math.round(area.w * 0.96), deck: size * 0.26, posts: size * 0.85 },
    seats: [{ x: area.x + seat, y: deck }, { x: area.x + area.w - seat, y: deck }],
    bucket: { x: area.x + area.w / 2, y: deck - bucketSize * 0.42, size: bucketSize },
  };
}

export function playLayout(width, height, { fill = false, rival = false } = {}) {
  const top = barLayout(width, height, { rival });
  const start = top.bar.y + top.bar.h + top.gap;
  const layout = {
    width, height, fill, ...top,
    ...sceneLayout(box(0, start, width, height - start), { least: 56 }),
    album: albumBadge(top, rival),
    hold: box(0, start, width, height - (fill ? CORNER : 0) - start),
  };
  layout.reach = { w: width, h: depthOf(layout, 1) - depthOf(layout, 0), radius: layout.fish * 0.42 };
  return layout;
}

export function depthOf(layout, share) {
  const bottom = layout.floor.y + layout.floor.h * 0.3;
  return layout.horizon + (bottom - layout.horizon) * share;
}

export function playTargets(layout, { volume = false } = {}) {
  const { pause, speaker, music } = layout.controls;
  const targets = [target("water", "water", layout.hold), target("pause", "pause", pause), target("speaker", "speaker", speaker), target("music", "music", music)];
  return volume ? [target("volume", "volume", layout.volume), ...targets] : targets;
}

function soundTargets(width, height) {
  const size = height < 420 ? 48 : 56;
  return [target("speaker", "speaker", box(width - 8 - 2 * size, 8, size, size)), target("music", "music", box(width - 8 - size, 8, size, size))];
}

function cellsFor(page, columns, rows) {
  const size = Math.floor(Math.min(page.w / columns, page.h / rows));
  const left = page.x + (page.w - size * columns) / 2;
  const topEdge = page.y + (page.h - size * rows) / 2;
  return Array.from({ length: columns * rows }, (_, at) => box(left + (at % columns) * size, topEdge + Math.floor(at / columns) * size, size, size));
}

export function albumLayout(width, height, { fill = false } = {}) {
  const done = target("done", "done", box(PAD, 8, TILE, TILE));
  const top = 8 + TILE + 8;
  const page = box(PAD, top, width - 2 * PAD, height - top - (fill ? CORNER : PAD));
  const wide = page.w > page.h * 1.1;
  const [columns, rows] = wide ? [6, 4] : [4, 6];
  return { width, height, page, targets: [done, ...soundTargets(width, height)], cells: cellsFor(box(page.x + 8, page.y + 8, page.w - 16, page.h - 16), columns, rows) };
}
