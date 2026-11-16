import { describe, expect, it } from "vitest";
import { overlap } from "../../../kit/src/canvas/layout.js";
import { checkTargets, eachSize, inside } from "../../../kit/test/canvas/sizes.js";
import { TALL, WIDE } from "../src/arena.js";
import { TALLY, headingOn, playLayout, playTargets, pointOf, skyAt } from "../src/layout.js";

describe("the play screen's layout", () => {
  it("keeps the whole sky on screen at every size, in its one shape, upright or lying on its side", () => {
    eachSize(({ width, height, fill }) => {
      const { arena, bar } = playLayout(width, height, { fill });
      const name = `${width}x${height}`;
      expect(inside(arena, width, height), name).toBe(true);
      expect(arena.y, name).toBeGreaterThanOrEqual(bar.y + bar.h);
      const [across, down] = arena.side ? [TALL, WIDE] : [WIDE, TALL];
      expect(arena.w / arena.unit, name).toBeCloseTo(across, 6);
      expect(arena.h / arena.unit, name).toBeCloseTo(down, 6);
      expect(arena.unit, name).toBeGreaterThanOrEqual(150);
    });
  });

  it("uses most of a phone held upright, and of a low room", () => {
    const upright = playLayout(384, 801, { fill: true });
    expect(upright.arena.side).toBe(false);
    expect(upright.arena.w).toBeGreaterThan(384 * 0.9);
    const low = playLayout(360, 343, { fill: false });
    expect(low.arena.side).toBe(true);
    expect(low.arena.w).toBeGreaterThan(360 * 0.8);
  });

  it("shows both balloon tallies clear of the bar, of each other and of the sky", () => {
    eachSize(({ width, height, fill }) => {
      const { tallies, arena, bar } = playLayout(width, height, { fill });
      const name = `${width}x${height}`;
      expect(tallies).toHaveLength(2);
      for (const tally of tallies) {
        expect(inside(tally, width, height), name).toBe(true);
        expect(tally.w, name).toBe(TALLY.w);
        expect(overlap(tally, bar), name).toBe(false);
        expect(overlap(tally, arena), name).toBe(false);
      }
      expect(overlap(tallies[0], tallies[1]), name).toBe(false);
      expect(tallies[0].x, name).toBeLessThan(tallies[1].x);
    });
  });

  it("offers pause, sound and a labelled button for each way to turn, large enough and apart at every size", () => {
    eachSize(({ width, height, fill }) => {
      const layout = playLayout(width, height, { fill });
      const targets = playTargets(layout);
      expect(targets.map((one) => `${one.kind}:${one.value}`)).toEqual(["pause:pause", "speaker:speaker", "music:music", "steer:left", "steer:right"]);
      checkTargets(targets, { width, height, fill, name: "play", least: (target) => (target.kind === "steer" ? 88 : 48) });
      expect(playTargets(layout, { volume: true })[0].kind).toBe("volume");
    });
  });

  it("puts a point of the sky on the screen and finds it again under a finger, wrapping what has left an edge", () => {
    eachSize(({ width, height, fill }) => {
      const layout = playLayout(width, height, { fill });
      const { arena } = layout;
      for (const [x, y] of [[0.2, 0.3], [0.9, 1.3], [0.5, 0.7]]) {
        const [px, py] = pointOf(layout, x, y);
        expect(px).toBeGreaterThanOrEqual(arena.x);
        expect(px).toBeLessThanOrEqual(arena.x + arena.w);
        expect(py).toBeGreaterThanOrEqual(arena.y);
        expect(py).toBeLessThanOrEqual(arena.y + arena.h);
        const back = skyAt(layout, { x: px, y: py });
        expect(back.x).toBeCloseTo(x, 6);
        expect(back.y).toBeCloseTo(y, 6);
        expect(pointOf(layout, x + 3 * WIDE, y - 2 * TALL)[0]).toBeCloseTo(px, 6);
      }
    });
  });

  it("takes a finger outside the sky as on its nearest edge", () => {
    const layout = playLayout(1280, 748, { fill: true });
    const far = skyAt(layout, { x: -50, y: -50 });
    const other = skyAt(layout, { x: 5000, y: 5000 });
    for (const point of [far, other]) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(WIDE);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(TALL);
    }
    expect(far).not.toEqual(other);
  });

  it("turns a heading with the sky: up the sky is up an upright screen and to the left of one on its side", () => {
    expect(headingOn(playLayout(384, 801, { fill: true }), 0, -1)).toEqual([0, -1]);
    const [hx, hy] = headingOn(playLayout(360, 343), 0, -1);
    expect(hx).toBe(-1);
    expect(Math.abs(hy)).toBe(0);
    const layout = playLayout(360, 343);
    const [x1, y1] = pointOf(layout, 0.5, 0.7);
    const [x2, y2] = pointOf(layout, 0.5, 0.6);
    expect(x2).toBeLessThan(x1);
    expect(y2).toBeCloseTo(y1, 6);
  });
});
