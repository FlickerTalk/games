import { describe, expect, it } from "vitest";
import { CORNER } from "../../../kit/src/canvas/layout.js";
import { SIZES, inside } from "../../../kit/test/canvas/sizes.js";
import { composeLayout, layoutTargets, playLayout } from "../src/layout.js";

const overlap = (one, two) => one.x < two.x + two.w - 0.01 && two.x < one.x + one.w - 0.01 && one.y < two.y + two.h - 0.01 && two.y < one.y + one.h - 0.01;
const SETS = [
  { name: "first", count: 4, choices: 3 },
  { name: "long", count: 7, choices: 4 },
];
const BAR = ["pause", "speaker", "music"];
const least = (target, scale) => Math.round((target.kind === "send" ? 120 : 88) * scale);

function each(run) {
  for (const [width, height, fill] of SIZES) {
    for (const set of SETS) for (const rival of [false, true]) run({ width, height, fill, name: set.name, layout: playLayout(width, height, { ...set, fill, rival }) });
    for (const gaps of [false, true]) run({ width, height, fill, name: gaps ? "compose" : "free", layout: composeLayout(width, height, { fill, gaps }) });
  }
}

describe("the play and compose screens' layout", () => {
  it("keeps the bar, the train and every control inside the frame and apart", () => {
    each(({ width, height, fill, name, layout }) => {
      const label = `${name} ${width}x${height} ${fill ? "fill" : "room"}`;
      const targets = layoutTargets(layout);
      const controls = targets.filter((one) => one.kind !== "slot");
      for (const area of [layout.bar, layout.band, ...targets]) expect(inside(area, width, height), `${label} ${area.kind ?? "area"}`).toBe(true);
      expect(overlap(layout.band, layout.bar), label).toBe(false);
      for (const target of controls.filter((one) => !BAR.includes(one.kind))) expect(overlap(target, layout.band), `${label} ${target.kind}:${target.value}`).toBe(false);
      targets.forEach((one, at) => targets.slice(at + 1).forEach((two) => expect(overlap(one, two), `${label} ${one.kind}:${one.value} ${two.kind}:${two.value}`).toBe(false)));
      expect(layout.train.left, label).toBeGreaterThanOrEqual(layout.band.x - 0.5);
      expect(layout.train.right, label).toBeLessThanOrEqual(layout.band.x + layout.band.w + 0.5);
    });
  });

  it("gives every control 88 px and the main button 120 px, shrinking them only in the room of the smallest phones", () => {
    each(({ width, height, fill, name, layout }) => {
      const label = `${name} ${width}x${height} ${fill ? "fill" : "room"}`;
      if (fill || height >= 500) expect(layout.scale, label).toBe(1);
      expect(layout.scale, label).toBeGreaterThanOrEqual(0.7);
      for (const target of layoutTargets(layout).filter((one) => !["slot", ...BAR].includes(one.kind))) {
        expect(Math.min(target.w, target.h), `${label} ${target.kind}`).toBeGreaterThanOrEqual(least(target, layout.scale));
      }
    });
  });

  it("puts nothing to touch in the bottom corners of a full screen", () => {
    each(({ width, height, fill, name, layout }) => {
      if (!fill) return;
      const corners = [{ x: 0, y: height - CORNER, w: CORNER, h: CORNER }, { x: width - CORNER, y: height - CORNER, w: CORNER, h: CORNER }];
      for (const target of layoutTargets(layout)) for (const corner of corners) expect(overlap(target, corner), `${name} ${width}x${height} ${target.kind}`).toBe(false);
    });
  });

  it("draws the wagons as large as the frame allows, and never too small to tell apart while playing", () => {
    const size = (width, height, fill, count = 7) => playLayout(width, height, { count, choices: 4, fill }).train.size;
    expect(size(384, 801, true)).toBeGreaterThanOrEqual(42);
    expect(size(360, 588, true)).toBeGreaterThanOrEqual(40);
    expect(size(1280, 748, true)).toBeGreaterThanOrEqual(80);
    expect(size(844, 338, true)).toBeGreaterThanOrEqual(60);
    expect(size(360, 343, false)).toBeGreaterThanOrEqual(38);
    expect(size(328, 343, false)).toBeGreaterThanOrEqual(34);
    expect(size(384, 801, true, 4)).toBeGreaterThan(size(384, 801, true, 7));
  });

  it("lines the wagons up behind the engine, one after another", () => {
    const { train } = playLayout(384, 801, { count: 6, choices: 4, fill: true });
    expect(train.xs).toHaveLength(6);
    expect(train.engineX).toBeLessThan(train.xs[0]);
    for (let at = 1; at < 6; at += 1) expect(train.xs[at] - train.xs[at - 1]).toBeCloseTo(train.size, 5);
  });

  it("offers the candidates in the siding, in order, and in two rows where four do not fit side by side", () => {
    const wide = playLayout(384, 801, { count: 6, choices: 4, fill: true });
    expect(layoutTargets(wide).filter((one) => one.kind === "candidate").map((one) => one.value)).toEqual([0, 1, 2, 3]);
    expect(new Set(wide.cells.map((one) => one.y)).size).toBe(1);
    const narrow = playLayout(328, 443, { count: 6, choices: 4, fill: false });
    expect(new Set(narrow.cells.map((one) => one.y)).size).toBe(2);
    expect(new Set(narrow.cells.map((one) => one.x)).size).toBe(2);
  });

  it("gives the composer the eight wagons, the beats, undo and one main button, and a slot over each wagon only where gaps are made", () => {
    const free = layoutTargets(composeLayout(384, 801, { fill: true, gaps: false }));
    expect(free.filter((one) => one.kind === "wagon").map((one) => one.value)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(["undo", "dots", "send"].every((kind) => free.some((one) => one.kind === kind))).toBe(true);
    expect(free.some((one) => one.kind === "slot")).toBe(false);
    const made = layoutTargets(composeLayout(384, 801, { fill: true, gaps: true }));
    expect(made.filter((one) => one.kind === "slot").map((one) => one.value)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("adds the volume line when the speaker has unfolded it", () => {
    const layout = playLayout(384, 801, { count: 4, choices: 3, fill: true });
    expect(layoutTargets(layout, { volume: true })[0]).toMatchObject({ kind: "volume", ...layout.volume });
  });
});
