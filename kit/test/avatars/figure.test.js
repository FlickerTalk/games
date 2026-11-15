import { describe, expect, it } from "vitest";
import { HAIRS, POSES, PROFILES } from "../../src/avatars/cast.js";
import { drawFigure } from "../../src/avatars/figure.js";
import { bounds, colours, draw, painted, shapes } from "./recorder.js";

const figure = (options, size = 190, x = 0, y = 0) => draw((ctx) => drawFigure(ctx, x, y, size, options));

describe("a figure", () => {
  it("has eight poses, each its own shape", () => {
    const drawn = POSES.map((pose) => JSON.stringify(shapes(figure({ who: "rio", hair: "bob", pose, time: 0.3 }))));
    expect(new Set(drawn).size).toBe(8);
  });

  it("wears the face its pose calls for, unless it is given one", () => {
    const expected = { idle: "neutral", run: "focused", jump: "cheering", swing: "determined", kick: "determined", block: "determined", celebrate: "cheering", lose: "oops" };
    for (const [pose, face] of Object.entries(expected)) {
      expect(shapes(figure({ who: "lou", pose, time: 0.2 })), pose).toEqual(shapes(figure({ who: "lou", pose, face, time: 0.2 })));
      expect(shapes(figure({ who: "lou", pose, face: "dizzy", time: 0.2 })), pose).not.toEqual(shapes(figure({ who: "lou", pose, time: 0.2 })));
      expect(shapes(figure({ who: "lou", pose, face: "angry", time: 0.2 })), pose).toEqual(shapes(figure({ who: "lou", pose, time: 0.2 })));
    }
  });

  it("is the same body for everyone, in the profile's colour, and Flick's in purple", () => {
    for (const profile of PROFILES) expect(colours(figure({ who: profile.id, pose: "run" }))).toContain(profile.colour);
    expect(colours(figure({ who: "flick", pose: "run" }))).toContain("#8D7DE8");
  });

  it("draws the same calls for the same time, and runs as time goes on", () => {
    const options = { who: "umi", hair: "two-puffs", pose: "run", time: 0.7 };
    expect(shapes(figure(options))).toEqual(shapes(figure(options)));
    expect(shapes(figure({ ...options, time: 0.8 }))).not.toEqual(shapes(figure(options)));
  });

  it("stays within its box in every pose and hairstyle", () => {
    for (const size of [60, 120, 240]) {
      for (const pose of POSES) {
        for (const hair of HAIRS) {
          for (const time of [0, 0.39, 1.1]) {
            const box = bounds(painted(figure({ who: "sam", hair: hair.id, pose, time }, size, 500, 500)));
            const where = `${pose} ${hair.id} ${size} ${time}`;
            expect(box.left, where).toBeGreaterThanOrEqual(500 - size * 0.45);
            expect(box.right, where).toBeLessThanOrEqual(500 + size * 0.45);
            expect(box.top, where).toBeGreaterThanOrEqual(500 - size * 0.7);
            expect(box.bottom, where).toBeLessThanOrEqual(500 + size * 0.55);
          }
        }
      }
    }
  });

  it("mirrors itself when flipped", () => {
    const plain = figure({ who: "val", hair: "cap", pose: "kick", time: 0.5 }, 190, 50, 50);
    const flipped = figure({ who: "val", hair: "cap", pose: "kick", time: 0.5, flip: true }, 190, 50, 50);
    const xs = (ctx) => painted(ctx).map(([x]) => x - 50);
    const mirrored = xs(plain);
    xs(flipped).forEach((x, at) => expect(x).toBeCloseTo(-mirrored[at], 6));
  });

  it("never throws, drawing an idle default for anything it does not know", () => {
    const fallback = shapes(figure({}));
    for (const options of [undefined, null, "kick", { pose: "dance", who: "nobody", hair: 4, face: {}, time: "late" }, { pose: "constructor" }]) {
      expect(shapes(figure(options)), JSON.stringify(options)).toEqual(fallback);
    }
    for (const size of [0, -5, Number.NaN]) expect(figure({}, size).calls).toEqual([]);
  });

  it("leaves the context as it found it", () => {
    for (const pose of POSES) {
      const ctx = figure({ who: "flick", pose, time: 2 }, 120, 30, 40);
      expect(ctx.depth, pose).toBe(0);
      expect(ctx.matrix, pose).toEqual([1, 0, 0, 1, 0, 0]);
    }
  });
});
