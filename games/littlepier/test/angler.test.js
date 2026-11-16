import { describe, expect, it } from "vitest";
import { FLICK, PROFILES } from "../../../kit/src/avatars/index.js";
import { bounds, colours, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { POSES, drawAngler, faceFor, rodTip } from "../src/angler.js";
import { THEME } from "../src/theme.js";

const ME = Object.freeze({ who: "milo", hair: "curls", hairColour: "ink" });

describe("an angler sitting on the pier", () => {
  it("is the player's own round face on one simple body in their profile's colour", () => {
    const ctx = draw((pen) => drawAngler(pen, 100, 300, 100, { player: ME, pose: "idle" }, THEME));
    expect(colours(ctx)).toContain(PROFILES.find((one) => one.id === "milo").colour);
    expect(colours(ctx)).toContain(THEME.art.body.rod);
    expect(ctx.depth).toBe(0);
  });

  it("is Flick the robot when the phone fishes", () => {
    expect(colours(draw((pen) => drawAngler(pen, 100, 300, 100, { player: { who: "flick" }, pose: "idle" }, THEME)))).toContain(FLICK.colour);
  });

  it("sits within its size: the head above the seat, the legs over the edge, the rod held out over the water", () => {
    for (const pose of POSES) {
      for (const flip of [false, true]) {
        const ctx = draw((pen) => drawAngler(pen, 200, 300, 100, { player: ME, pose, flip, time: 0.3 }, THEME));
        const box = bounds(painted(ctx));
        expect(box.top, pose).toBeGreaterThanOrEqual(300 - 100 * 1.12);
        expect(box.bottom, pose).toBeLessThanOrEqual(300 + 100 * 0.42);
        expect(box.left, pose).toBeGreaterThanOrEqual(200 - 100 * 0.62);
        expect(box.right, pose).toBeLessThanOrEqual(200 + 100 * 0.62);
      }
    }
  });

  it("holds the rod out towards the water, its tip where the line starts, mirrored on the other side", () => {
    const tip = rodTip(100, 300, 100, { pose: "idle" });
    expect(tip.x).toBeGreaterThan(140);
    expect(tip.y).toBeLessThan(230);
    const other = rodTip(100, 300, 100, { pose: "idle", flip: true });
    expect(other.x).toBeCloseTo(200 - tip.x);
    expect(other.y).toBeCloseTo(tip.y);
    expect(rodTip(100, 300, 100, { pose: "pulling" }).y).toBeLessThan(tip.y);
  });

  it("shows each moment of fishing in its own way", () => {
    const looks = POSES.map((pose) => shapes(draw((pen) => drawAngler(pen, 100, 300, 100, { player: ME, pose, time: 0 }, THEME))).join("\n"));
    expect(new Set(looks).size).toBe(POSES.length);
    expect(POSES).toEqual(["idle", "lowering", "pulling", "cheering", "laughing"]);
    expect(POSES.map(faceFor)).toEqual(["happy", "focused", "determined", "cheering", "laughing"]);
  });
});
