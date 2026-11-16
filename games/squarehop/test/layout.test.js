import { describe, expect, it } from "vitest";
import { overlap } from "../../../kit/src/canvas/layout.js";
import { SIZES, checkTargets, inside } from "../../../kit/test/canvas/sizes.js";
import { layoutTargets, playLayout, squareAt, trackIn } from "../src/layout.js";
import { FINISH } from "../src/rules.js";

const LEAST = { speaker: 48, music: 48, pause: 48, die: 96 };
const least = (target) => LEAST[target.kind] ?? 88;

describe("the track", () => {
  it("lays its squares in rows that all read from left to right, one after the other", () => {
    const track = trackIn({ x: 10, y: 100, w: 360, h: 500 }, FINISH);
    expect(track.cols * track.rows).toBeGreaterThanOrEqual(FINISH);
    for (let square = 2; square <= FINISH; square += 1) {
      const [before, here] = [squareAt(track, square - 1), squareAt(track, square)];
      if (here.row === before.row) expect(here.x).toBeGreaterThan(before.x);
      else {
        expect(here.row).toBe(before.row + 1);
        expect(here.col).toBe(0);
        expect(here.y).toBeGreaterThan(before.y);
      }
    }
  });

  it("stays inside the region it is given, centred", () => {
    const region = { x: 10, y: 100, w: 360, h: 500 };
    const track = trackIn(region, FINISH);
    expect(track.x).toBeGreaterThanOrEqual(region.x);
    expect(track.y).toBeGreaterThanOrEqual(region.y);
    expect(track.x + track.w).toBeLessThanOrEqual(region.x + region.w + 0.01);
    expect(track.y + track.h).toBeLessThanOrEqual(region.y + region.h + 0.01);
    expect(track.x - region.x).toBeCloseTo(region.x + region.w - track.x - track.w, 5);
  });
});

describe("the play screen's layout", () => {
  it("fits every frame: targets inside, large enough, apart, and out of the bottom corners of a full screen", () => {
    for (const [width, height, fill] of SIZES) {
      const layout = playLayout(width, height, { fill });
      checkTargets(layoutTargets(layout), { width, height, fill, name: "play", least });
      checkTargets(layoutTargets(layout, { volume: true }).filter((one) => one.kind !== "die"), { width, height, fill, name: "volume", least: (one) => (one.kind === "volume" ? 48 : least(one)) });
    }
  });

  it("gives each die 120 px where the frame is a phone held upright", () => {
    for (const [width, height] of [[360, 588], [384, 801], [430, 880], [384, 556]]) {
      const { dice } = playLayout(width, height, { fill: true });
      for (const die of dice) expect(Math.min(die.w, die.h), `${width}x${height}`).toBeGreaterThanOrEqual(120);
    }
  });

  it("keeps the whole track on the screen, under the bar and clear of the dice, with squares that hold a 20 px number", () => {
    for (const [width, height, fill] of SIZES) {
      const layout = playLayout(width, height, { fill });
      const { track, bar, dice } = layout;
      const name = `${width}x${height}`;
      const area = { x: track.x, y: track.y, w: track.w, h: track.h };
      expect(inside(area, width, height), name).toBe(true);
      expect(track.y, name).toBeGreaterThanOrEqual(bar.y + bar.h);
      for (const die of dice) expect(overlap(area, die), name).toBe(false);
      expect(track.cell, name).toBeGreaterThanOrEqual(32);
      expect(track.cell, name).toBeLessThanOrEqual(96);
    }
  });

  it("puts the dice beside the track when the frame is short, and under it on a phone held upright", () => {
    expect(playLayout(384, 801, { fill: true }).side).toBe(false);
    expect(playLayout(360, 343, { fill: false }).side).toBe(true);
    expect(playLayout(844, 338, { fill: true }).side).toBe(true);
    expect(playLayout(1280, 748, { fill: true }).track.cols).toBe(10);
  });

  it("offers the dice only while they can be chosen", () => {
    const layout = playLayout(384, 801, { fill: true });
    expect(layoutTargets(layout).filter((one) => one.kind === "die").map((one) => one.value)).toEqual([0, 1]);
    expect(layoutTargets(layout, { dice: false }).some((one) => one.kind === "die")).toBe(false);
  });
});
