import { describe, expect, it } from "vitest";
import { CORNER, overlap } from "../../../kit/src/canvas/layout.js";
import { SIZES, checkTargets, inside } from "../../../kit/test/canvas/sizes.js";
import { albumLayout, depthOf, playLayout, playTargets, sceneLayout } from "../src/layout.js";

const BAR = new Set(["pause", "speaker", "music"]);
const least = (target) => (BAR.has(target.kind) ? 48 : 88);
const each = (run) => SIZES.forEach(([width, height, fill]) => run({ width, height, fill, name: `${width}x${height}${fill ? " fill" : ""}` }));

describe("the play screen", () => {
  it("offers the water to hold, pause and the sound, each large enough, inside the frame and clear of the bottom corners", () => {
    each(({ width, height, fill, name }) => {
      for (const rival of [false, true]) {
        const layout = playLayout(width, height, { fill, rival });
        const targets = playTargets(layout);
        expect(targets.map((one) => one.kind).sort(), name).toEqual(["music", "pause", "speaker", "water"]);
        checkTargets(targets, { width, height, fill, name, least });
        expect(playTargets(layout, { volume: true })[0].kind).toBe("volume");
      }
    });
  });

  it("puts the bar on top, then the sky with room for the anglers' heads, then the water down to the floor", () => {
    each(({ width, height, fill, name }) => {
      const layout = playLayout(width, height, { fill });
      expect(layout.sky.y, name).toBeGreaterThanOrEqual(layout.bar.y + layout.bar.h);
      expect(layout.sky.y + layout.sky.h, name).toBe(layout.horizon);
      expect(layout.deck - layout.size * 1.08, name).toBeGreaterThanOrEqual(layout.sky.y - 0.5);
      expect(layout.water.y, name).toBe(layout.horizon);
      expect(layout.water.y + layout.water.h, name).toBe(height);
      expect(layout.water.h, name).toBeGreaterThanOrEqual(height * 0.45);
      expect(layout.floor.y + layout.floor.h, name).toBe(height);
      expect(layout.fish, name).toBeGreaterThanOrEqual(34);
      expect(layout.fish, name).toBeLessThanOrEqual(layout.water.h * 0.4);
    });
  });

  it("seats the player on the left and Flick on the right, each rod reaching out over its own hook", () => {
    each(({ width, height, fill, name }) => {
      const layout = playLayout(width, height, { fill });
      const [mine, flick] = layout.seats;
      expect(mine.x - layout.size * 0.62, name).toBeGreaterThanOrEqual(0);
      expect(flick.x + layout.size * 0.62, name).toBeLessThanOrEqual(width);
      expect(flick.x, name).toBeCloseTo(width - mine.x);
      expect(layout.hooks[0], name).toBeGreaterThan(mine.x);
      expect(layout.hooks[1], name).toBeLessThan(flick.x);
      expect(layout.hooks[0], name).toBeLessThan(layout.hooks[1]);
      expect(layout.pier.x, name).toBeGreaterThanOrEqual(0);
      expect(layout.pier.x + layout.pier.w, name).toBeLessThanOrEqual(width);
      expect(layout.bucket.x, name).toBe(width / 2);
      expect(layout.bucket.y + layout.bucket.size * 0.42, name).toBeCloseTo(layout.deck, 0);
    });
  });

  it("maps a depth to the water, from the surface down to the floor", () => {
    const layout = playLayout(384, 801, { fill: true });
    expect(depthOf(layout, 0)).toBe(layout.horizon);
    expect(depthOf(layout, 1)).toBe(layout.floor.y + layout.floor.h * 0.3);
    expect(layout.reach).toEqual({ w: 384, h: depthOf(layout, 1) - depthOf(layout, 0), radius: layout.fish * 0.42 });
  });

  it("shows the album in the bar only where it leaves the buttons and the score their room", () => {
    each(({ width, height, fill, name }) => {
      for (const rival of [false, true]) {
        const layout = playLayout(width, height, { fill, rival });
        if (!layout.album) continue;
        const { pause, speaker, music } = layout.controls;
        for (const button of [pause, speaker, music]) expect(overlap(layout.album, button), name).toBe(false);
        expect(layout.album.x, name).toBeGreaterThan(layout.bar.x + 110);
        expect(inside(layout.album, width, height), name).toBe(true);
      }
    });
    expect(playLayout(384, 801, { fill: true }).album).not.toBeNull();
  });
});

describe("a scene in any box", () => {
  it("fits the pier, the anglers and some water inside the box it is given, as on the home screen", () => {
    for (const area of [{ x: 0, y: 80, w: 384, h: 300 }, { x: 20, y: 120, w: 300, h: 160 }, { x: 0, y: 64, w: 844, h: 120 }]) {
      const scene = sceneLayout(area);
      const name = JSON.stringify(area);
      expect(scene.deck - scene.size * 1.08, name).toBeGreaterThanOrEqual(area.y - 0.5);
      expect(scene.water.y + scene.water.h, name).toBe(area.y + area.h);
      expect(scene.water.h, name).toBeGreaterThan(area.h * 0.3);
      expect(scene.seats[0].x - scene.size * 0.62, name).toBeGreaterThanOrEqual(area.x);
      expect(scene.seats[1].x + scene.size * 0.62, name).toBeLessThanOrEqual(area.x + area.w);
    }
  });
});

describe("the album page", () => {
  it("has a big way back and the sound, and places for all twenty-four creatures inside the frame", () => {
    each(({ width, height, fill, name }) => {
      const layout = albumLayout(width, height, { fill });
      checkTargets(layout.targets, { width, height, fill, name });
      expect(layout.targets.map((one) => one.kind).sort(), name).toEqual(["done", "music", "speaker"]);
      expect(layout.cells, name).toHaveLength(24);
      for (const cell of layout.cells) {
        expect(inside(cell, width, height), name).toBe(true);
        expect(cell.w, name).toBeGreaterThanOrEqual(36);
        expect(cell.y + cell.h, name).toBeLessThanOrEqual(height - (fill ? CORNER : 0));
      }
      layout.cells.forEach((one, at) => layout.cells.slice(at + 1).forEach((two) => expect(overlap(one, two), name).toBe(false)));
    });
  });
});
