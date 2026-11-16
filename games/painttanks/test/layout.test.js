import { describe, expect, it } from "vitest";
import { checkTargets, eachSize, leastFor } from "../../../kit/test/canvas/sizes.js";
import { playLayout, playTargets, toScreen, toWorld } from "../src/layout.js";
import { WORLD } from "../src/world.js";

const kinds = (targets) => targets.map((one) => one.kind);
const least = (target) => (target.kind === "pause" ? 48 : leastFor(target));

describe("the play screen's layout", () => {
  it("keeps every control inside the frame, 88 px or more, apart, and out of the bottom corners in full screen", () => {
    eachSize(({ width, height, fill }) => {
      for (const sub of [false, true]) {
        for (const practice of [false, true]) {
          const layout = playLayout(width, height, { fill, practice });
          checkTargets(playTargets(layout, { sub }), { width, height, fill, least, name: `sub ${sub} practice ${practice}` });
        }
      }
    });
  });

  it("offers aim, power and the big shoot button, the dive button only to a submarine, and folds the dials under an open volume line", () => {
    const layout = playLayout(384, 801, { fill: true });
    expect(kinds(playTargets(layout, {}))).toEqual(["pause", "speaker", "music", "angle", "power", "fire"]);
    expect(kinds(playTargets(layout, { sub: true }))).toEqual(["pause", "speaker", "music", "angle", "power", "dive", "fire"]);
    expect(layout.fire.w).toBeGreaterThanOrEqual(120);
    const open = kinds(playTargets(layout, { volume: true }));
    expect(open[0]).toBe("volume");
    expect(open).not.toContain("power");
  });

  it("fits the whole battlefield across the frame, as large as the frame allows, its ground at the bottom", () => {
    eachSize(({ width, height, fill }) => {
      const { view } = playLayout(width, height, { fill });
      expect(view.scale * WORLD.width, `${width}x${height}`).toBeLessThanOrEqual(width + 0.5);
      expect(view.y + WORLD.height * view.scale, `${width}x${height}`).toBeCloseTo(height, 0);
      expect(view.x).toBeGreaterThanOrEqual(-0.5);
    });
  });

  it("keeps the controls in the sky, clear of the vehicles and of the ground between them", () => {
    eachSize(({ width, height, fill }) => {
      const layout = playLayout(width, height, { fill });
      const [, ground] = toScreen(layout.view, 0, WORLD.height * 0.4);
      const shown = width < 352 ? playTargets(layout, {}) : playTargets(layout, { sub: true }).concat(playTargets(layout, {}));
      for (const target of shown) {
        expect(target.y + target.h, `${width}x${height} ${target.kind}`).toBeLessThanOrEqual(ground);
      }
    });
  });

  it("stands the wind flag under the shoot button, inside the frame", () => {
    eachSize(({ width, height, fill }) => {
      const { flag, fire } = playLayout(width, height, { fill });
      expect(flag.y - flag.size).toBeGreaterThanOrEqual(fire.y + fire.h);
      expect(flag.y).toBeLessThan(height);
      expect(flag.x).toBeGreaterThan(0);
      expect(flag.x).toBeLessThan(width);
    });
  });

  it("turns screen points into world points and back, and mirrors the world for the player on the right", () => {
    const { view } = playLayout(384, 801, { fill: true });
    const mirrored = { ...view, mirror: true };
    for (const one of [view, mirrored]) {
      const [x, y] = toScreen(one, 100, 300);
      const back = toWorld(one, x, y);
      expect(back[0]).toBeCloseTo(100, 6);
      expect(back[1]).toBeCloseTo(300, 6);
    }
    expect(toScreen(mirrored, 100, 300)[0]).toBeCloseTo(toScreen(view, WORLD.width - 100, 300)[0], 6);
  });
});
