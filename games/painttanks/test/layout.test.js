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

  it("fits the whole battlefield across the frame, as large as the frame allows", () => {
    eachSize(({ width, height, fill }) => {
      const { view } = playLayout(width, height, { fill });
      expect(view.scale * WORLD.width, `${width}x${height}`).toBeLessThanOrEqual(width + 0.5);
      expect(view.y + WORLD.height * view.scale, `${width}x${height}`).toBeLessThanOrEqual(height + 0.5);
      expect(view.x).toBeGreaterThanOrEqual(-0.5);
    });
  });

  it("keeps the controls off the battlefield: in the sky above it, or the shoot button on the ground under it", () => {
    eachSize(({ width, height, fill }) => {
      const layout = playLayout(width, height, { fill });
      const [, ground] = toScreen(layout.view, 0, WORLD.height * 0.4);
      const [, foot] = toScreen(layout.view, 0, WORLD.height);
      const shown = width < 352 ? playTargets(layout, {}) : playTargets(layout, { sub: true }).concat(playTargets(layout, {}));
      for (const target of shown) {
        const clear = target.y + target.h <= ground || (target.kind === "fire" && target.y >= foot - 0.5);
        expect(clear, `${width}x${height} ${target.kind}`).toBe(true);
      }
    });
  });

  it("puts the big shoot button under the battlefield on a phone held upright, without making the battlefield smaller", () => {
    for (const [width, height] of [[384, 801], [430, 880]]) {
      const layout = playLayout(width, height, { fill: true });
      expect(layout.view.scale).toBeCloseTo(width / WORLD.width, 6);
      expect(layout.fire.w).toBe(120);
      expect(layout.fire.y).toBeGreaterThanOrEqual(layout.view.y + WORLD.height * layout.view.scale - 0.5);
      expect(layout.sub.fire).toEqual(layout.fire);
    }
  });

  it("stands the wind flag in the sky under the controls, inside the frame", () => {
    eachSize(({ width, height, fill }) => {
      const { flag, start } = playLayout(width, height, { fill });
      expect(flag.y - flag.size).toBeGreaterThanOrEqual(start + 88);
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
