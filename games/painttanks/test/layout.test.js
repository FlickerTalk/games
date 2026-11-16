import { describe, expect, it } from "vitest";
import { overlap } from "../../../kit/src/canvas/layout.js";
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
    expect(kinds(playTargets(layout, { sub: true }))).toContain("dive");
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

  it("keeps the two vehicles clear of the controls", () => {
    eachSize(({ width, height, fill }) => {
      const layout = playLayout(width, height, { fill });
      for (const at of [0.2, 0.8]) {
        const [x, top] = toScreen(layout.view, at * WORLD.width - 40, WORLD.height * 0.4);
        const [, bottom] = toScreen(layout.view, at * WORLD.width, WORLD.height * 0.86);
        const body = { x, y: top, w: 80 * layout.view.scale, h: bottom - top };
        for (const target of playTargets(layout, { sub: true })) expect(overlap(body, target), `${width}x${height} ${target.kind} ${at}`).toBe(false);
      }
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
