import { describe, expect, it } from "vitest";
import { CORNER } from "../../../kit/src/canvas/layout.js";
import { FILL_SIZES, ROOM_SIZES, inside } from "../../../kit/test/canvas/sizes.js";
import { buildLayout, layoutTargets, playLayout } from "../src/layout.js";

const overlap = (one, two) => one.x < two.x + two.w && two.x < one.x + one.w && one.y < two.y + two.h && two.y < one.y + one.h;
const SETS = [
  { name: "arrows", commands: ["L", "F", "R"], size: 7 },
  { name: "all", commands: ["L", "F", "R", "U", "ring"], size: 7 },
  { name: "small", commands: ["L", "F", "R"], size: 5 },
];
const CASES = [...FILL_SIZES.map(([width, height]) => [width, height, true]), ...ROOM_SIZES.map(([width, height]) => [width, height, false])];
const least = (target, scale) => Math.round((target.kind === "play" || target.kind === "send" ? 120 : 88) * scale);

function each(run) {
  for (const [width, height, fill] of CASES) {
    for (const set of SETS) for (const rival of [false, true]) run({ width, height, fill, rival, ...set, layout: playLayout(width, height, { ...set, fill, rival }) });
    run({ width, height, fill, rival: false, name: "build", size: 6, layout: buildLayout(width, height, { fill }) });
  }
}

describe("the play and build screens' layout", () => {
  it("keeps the bar, the board, the strip and every control inside the frame and apart", () => {
    each(({ width, height, layout, name, fill }) => {
      const label = `${name} ${width}x${height} ${fill ? "fill" : "room"}`;
      const targets = layoutTargets(layout).filter((one) => one.kind !== "cell");
      const areas = [layout.frame, layout.bar, ...(layout.strip ? [layout.strip] : [])];
      for (const area of [...areas, ...targets]) expect(inside(area, width, height), `${label} ${area.kind ?? "area"}`).toBe(true);
      expect(overlap(layout.frame, layout.bar), label).toBe(false);
      if (layout.strip) expect(overlap(layout.frame, layout.strip), label).toBe(false);
      for (const target of targets.filter((one) => !["pause", "speaker", "music"].includes(one.kind))) {
        for (const area of areas) expect(overlap(target, area), `${label} ${target.kind}`).toBe(false);
      }
      targets.forEach((one, at) => targets.slice(at + 1).forEach((two) => expect(overlap(one, two), `${label} ${one.kind}:${one.value} ${two.kind}:${two.value}`).toBe(false)));
    });
  });

  it("gives every control 88 px and the play and send buttons 120 px, shrinking them only in the room of the smallest phones", () => {
    each(({ width, height, fill, layout, name }) => {
      const label = `${name} ${width}x${height} ${fill ? "fill" : "room"}`;
      if (fill || height >= 500) expect(layout.scale, label).toBe(1);
      expect(layout.scale, label).toBeGreaterThanOrEqual(0.75);
      for (const target of layoutTargets(layout).filter((one) => !["cell", "pause", "speaker", "music"].includes(one.kind))) {
        expect(Math.min(target.w, target.h), `${label} ${target.kind}`).toBeGreaterThanOrEqual(least(target, layout.scale));
      }
    });
  });

  it("puts nothing to touch in the bottom corners of a full screen", () => {
    each(({ width, height, fill, layout, name }) => {
      if (!fill) return;
      const corners = [{ x: 0, y: height - CORNER, w: CORNER, h: CORNER }, { x: width - CORNER, y: height - CORNER, w: CORNER, h: CORNER }];
      for (const target of layoutTargets(layout)) for (const corner of corners) expect(overlap(target, corner), `${name} ${width}x${height} ${target.kind}`).toBe(false);
    });
  });

  it("makes the board's tiles as large as the frame allows", () => {
    const cell = (width, height, fill, size = 7) => playLayout(width, height, { commands: ["L", "F", "R"], size, fill }).board.cell;
    expect(cell(384, 801, true)).toBeGreaterThanOrEqual(44);
    expect(cell(360, 588, true)).toBeGreaterThanOrEqual(32);
    expect(cell(384, 556, false)).toBeGreaterThanOrEqual(28);
    expect(cell(1280, 748, true)).toBeGreaterThanOrEqual(64);
    expect(cell(844, 338, true)).toBeGreaterThanOrEqual(30);
    expect(cell(360, 343, false)).toBeGreaterThanOrEqual(16);
    expect(cell(384, 801, true, 5)).toBeGreaterThan(cell(384, 801, true, 7));
  });

  it("names the commands it shows, in the order given, and offers the touchable tiles only when making a level", () => {
    const layout = playLayout(384, 801, { commands: ["L", "F", "R", "U"], size: 6, fill: true });
    expect(layoutTargets(layout).filter((one) => one.kind === "command").map((one) => one.value)).toEqual(["L", "F", "R", "U"]);
    expect(layoutTargets(layout).filter((one) => one.kind === "cell")).toEqual([]);
    const build = buildLayout(384, 801, { fill: true });
    const cells = layoutTargets(build).filter((one) => one.kind === "cell");
    expect(cells).toHaveLength(36);
    expect(cells[7]).toMatchObject({ value: 7, x: build.board.x + build.board.cell, y: build.board.y + build.board.cell, w: build.board.cell });
    expect(layoutTargets(build).filter((one) => one.kind === "tool").map((one) => one.value)).toEqual(["wall", "puddle", "battery", "door", "goal", "robot"]);
    expect(layoutTargets(build).some((one) => one.kind === "send")).toBe(true);
  });

  it("adds the volume line when the speaker has unfolded it", () => {
    const layout = playLayout(384, 801, { commands: ["L", "F", "R"], size: 6, fill: true });
    expect(layoutTargets(layout, { volume: true })[0]).toMatchObject({ kind: "volume", ...layout.volume });
  });
});
