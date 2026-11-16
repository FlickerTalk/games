import { expect } from "vitest";
import { CORNER, overlap } from "../../src/canvas/layout.js";

export const FILL_SIZES = Object.freeze([[360, 588], [384, 801], [390, 792], [430, 880], [844, 338], [1280, 748]]);
export const ROOM_SIZES = Object.freeze([[384, 556], [360, 443], [360, 343], [1280, 503], [430, 635], [352, 556], [328, 443], [328, 343], [398, 635]]);
export const SIZES = Object.freeze([...FILL_SIZES.map(([width, height]) => [width, height, true]), ...ROOM_SIZES.map(([width, height]) => [width, height, false])]);

export const inside = (area, width, height) => area.x >= 0 && area.y >= 0 && area.x + area.w <= width + 0.5 && area.y + area.h <= height + 0.5;

const LEAST = { speaker: 48, music: 48, play: 120, again: 120, resume: 120 };
export const leastFor = (target) => LEAST[target.kind] ?? 88;

export function eachSize(run) {
  for (const [width, height, fill] of SIZES) run({ width, height, fill });
}

export function checkTargets(targets, { width, height, fill, name = "", least = leastFor }) {
  expect(targets.length, name).toBeGreaterThan(0);
  const corners = [{ x: 0, y: height - CORNER, w: CORNER, h: CORNER }, { x: width - CORNER, y: height - CORNER, w: CORNER, h: CORNER }];
  for (const target of targets) {
    const label = `${name} ${width}x${height} ${target.kind}:${target.value}`;
    expect(inside(target, width, height), label).toBe(true);
    expect(Math.min(target.w, target.h), label).toBeGreaterThanOrEqual(least(target));
    if (fill) for (const corner of corners) expect(overlap(target, corner), label).toBe(false);
  }
  targets.forEach((one, at) => targets.slice(at + 1).forEach((two) => expect(overlap(one, two), `${name} ${width}x${height} ${one.kind}:${one.value} ${two.kind}:${two.value}`).toBe(false)));
}
