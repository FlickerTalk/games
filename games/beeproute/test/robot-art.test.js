import { describe, expect, it } from "vitest";
import { bounds, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { POSES_SHOWN, drawGiftBox, drawRobot } from "../src/robot-art.js";
import { THEME } from "../src/theme.js";

const ME = { who: "ari", hair: "bob", hairColour: "ink" };
const robot = (options = {}) => draw((ctx) => drawRobot(ctx, 100, 100, 60, { look: "box", dir: 0, pose: "idle", time: 0.3, face: ME, ...options }, THEME));
const lines = (ctx) => shapes(ctx).join("\n");

describe("the robot", () => {
  it("stays near its tile, feet, arms and antenna included, and leaves the drawing state as it found it", () => {
    for (const look of ["box", "capsule", "wide", "cone", "ball", "star"]) {
      for (const pose of POSES_SHOWN) {
        const ctx = robot({ look, pose });
        const box = bounds(painted(ctx));
        expect(box.left, `${look} ${pose}`).toBeGreaterThan(100 - 45);
        expect(box.right, `${look} ${pose}`).toBeLessThan(100 + 45);
        expect(box.top, `${look} ${pose}`).toBeGreaterThan(100 - 45);
        expect(box.bottom, `${look} ${pose}`).toBeLessThan(100 + 45);
        expect(ctx.depth).toBe(0);
      }
    }
  });

  it("has six different shapes, one per look", () => {
    const looks = ["box", "capsule", "wide", "cone", "ball", "star"].map((look) => lines(robot({ look })));
    expect(new Set(looks).size).toBe(6);
  });

  it("faces each of the four ways, and moves, turns, bumps, shrugs and cheers differently", () => {
    expect(new Set([0, 1, 2, 3].map((dir) => lines(robot({ dir })))).size).toBe(4);
    expect(new Set(POSES_SHOWN.map((pose) => lines(robot({ pose })))).size).toBe(POSES_SHOWN.length);
    expect(POSES_SHOWN).toEqual(["idle", "move", "turn", "bump", "shrug", "cheer"]);
  });

  it("carries the face of whoever drives it on its screen, upright whichever way it faces", () => {
    expect(lines(robot({ face: { who: "flick" } }))).not.toBe(lines(robot()));
    expect(lines(robot({ face: { who: "noa", hair: "none", hairColour: "ink" } }))).not.toBe(lines(robot()));
    const clips = (ctx) => ctx.calls.filter((call) => call.op === "clip").length;
    expect(clips(robot())).toBe(1);
  });
});

describe("a wrapped surprise", () => {
  it("draws inside its area and wobbles when shaken", () => {
    const area = { x: 10, y: 20, w: 80, h: 80 };
    const still = draw((ctx) => drawGiftBox(ctx, area, 0, THEME));
    const box = bounds(painted(still));
    expect(box.left).toBeGreaterThanOrEqual(10);
    expect(box.right).toBeLessThanOrEqual(90);
    expect(box.top).toBeGreaterThanOrEqual(20);
    expect(box.bottom).toBeLessThanOrEqual(100);
    expect(shapes(draw((ctx) => drawGiftBox(ctx, area, 0.3, THEME)))).not.toEqual(shapes(still));
  });
});
