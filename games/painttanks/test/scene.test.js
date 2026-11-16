import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { drawScene, waveAt } from "../src/scene.js";
import { THEME } from "../src/theme.js";
import { FIELDS, WORLD, heightsFor } from "../src/world.js";

const art = THEME.art;
const worldOf = (field, craters = []) => ({ field, seed: "AbCdEfGh", heights: heightsFor(field, "AbCdEfGh"), craters, under: [false, false] });
const scene = (field, options = {}) => draw((ctx) => drawScene(ctx, worldOf(field, options.craters), { scenery: "meadow", left: -60, right: WORLD.width + 60, bottom: WORLD.height + 40, time: 1, wind: 0.5, ...options }, art));

describe("the battlefield's scenery", () => {
  it("draws each battlefield its own way, across the whole width it is asked for", () => {
    const drawn = FIELDS.map((field) => scene(field));
    expect(new Set(drawn.map((ctx) => shapes(ctx).join("|"))).size).toBe(4);
    for (const ctx of drawn) {
      const box = bounds(painted(ctx));
      expect(box.left).toBeLessThanOrEqual(-60);
      expect(box.right).toBeGreaterThanOrEqual(WORLD.width + 60);
      expect(ctx.depth).toBe(0);
    }
  });

  it("shows a bite in the hill where paint has landed", () => {
    expect(shapes(scene("land", { craters: [{ x: 200, y: 330, r: 16 }] }))).not.toEqual(shapes(scene("land")));
  });

  it("takes its colours from the scenery: meadow, dunes or snow", () => {
    const meadow = colours(scene("land"));
    const snow = colours(scene("land", { scenery: "snow" }));
    expect(meadow).toContain(art.scenery.meadow.ground);
    expect(snow).toContain(art.scenery.snow.ground);
    expect(snow).not.toContain(art.scenery.meadow.ground);
  });

  it("moves the waves slowly with time, a few pixels up and down", () => {
    expect(waveAt(100, 1)).not.toBe(waveAt(100, 2));
    for (let time = 0; time < 5; time += 0.5) expect(Math.abs(waveAt(100, time))).toBeLessThanOrEqual(4.5);
  });
});
