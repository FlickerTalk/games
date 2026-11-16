import { describe, expect, it } from "vitest";
import { bounds, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { POSES, drawHelmetBalloon, drawKnight, drawSword, tipOf } from "../src/knights.js";
import { BALLOON_LIFT } from "../src/layout.js";
import { SWORDS } from "../src/levels.js";
import { THEME } from "../src/theme.js";

const PLAYER = { who: "p01", hair: "none", hairColour: "brown", name: "" };
const knight = (more = {}) => ({ player: PLAYER, pose: "wait", progress: 0, flip: false, sword: "broad", side: "mine", balloon: 1, ...more });
const area = (ctx) => bounds(painted(ctx));

describe("a foam sword", () => {
  it("has six shapes, each its own outline, drawn from the grip up", () => {
    const seen = new Set();
    for (const shape of SWORDS) {
      const ctx = draw((pen) => drawSword(pen, 100, 200, 80, shape, 0, THEME));
      expect(ctx.depth, shape).toBe(0);
      const box = area(ctx);
      expect(box.top, shape).toBeGreaterThanOrEqual(200 - 80 * 1.05);
      expect(box.top, shape).toBeLessThanOrEqual(200 - 80 * 0.8);
      expect(box.bottom, shape).toBeLessThanOrEqual(200 + 80 * 0.3);
      expect(Math.abs((box.left + box.right) / 2 - 100), shape).toBeLessThan(80 * 0.12);
      seen.add(shapes(ctx).join("|"));
    }
    expect(seen.size).toBeGreaterThanOrEqual(4);
  });

  it("turns about its grip", () => {
    const box = area(draw((pen) => drawSword(pen, 100, 200, 80, "long", Math.PI / 2, THEME)));
    expect(box.right).toBeGreaterThan(100 + 80 * 0.8);
    expect(box.top).toBeGreaterThan(200 - 80 * 0.3);
  });
});

describe("the balloon on a helmet", () => {
  it("is an oval for the player and a rounded square for the other, so shape tells them apart", () => {
    const mine = draw((pen) => drawHelmetBalloon(pen, 50, 50, 40, "mine", THEME));
    const theirs = draw((pen) => drawHelmetBalloon(pen, 50, 50, 40, "theirs", THEME));
    expect(mine.calls.some((call) => call.op === "ellipse")).toBe(true);
    expect(theirs.calls.filter((call) => call.op === "arcTo").length).toBeGreaterThanOrEqual(4);
    expect(shapes(mine).join("|")).not.toBe(shapes(theirs).join("|"));
    for (const ctx of [mine, theirs]) expect(ctx.depth).toBe(0);
  });

  it("grows from nothing while it is blown up", () => {
    const wide = (grown) => {
      const box = area(draw((pen) => drawHelmetBalloon(pen, 50, 50, 40, "mine", THEME, { grown })));
      return box.right - box.left;
    };
    expect(wide(0.15)).toBeLessThan(wide(1) * 0.6);
    expect(painted(draw((pen) => drawHelmetBalloon(pen, 50, 50, 40, "mine", THEME, { grown: 0 })))).toEqual([]);
  });
});

describe("a knight", () => {
  it("stands on the ground in every pose, at any size, with the balloon over the head", () => {
    for (const size of [64, 140]) {
      for (const pose of POSES) {
        for (const progress of [0, 0.5, 1]) {
          const ctx = draw((pen) => drawKnight(pen, 300, 400, size, knight({ pose, progress }), THEME, 1.3));
          const box = area(ctx);
          const name = `${pose} ${size} ${progress}`;
          expect(ctx.depth, name).toBe(0);
          expect(box.bottom, name).toBeLessThanOrEqual(400 + size * 0.12);
          expect(box.top, name).toBeGreaterThanOrEqual(400 - size * (BALLOON_LIFT + 0.4));
          expect(box.left, name).toBeGreaterThanOrEqual(300 - size * 1.1);
          expect(box.right, name).toBeLessThanOrEqual(300 + size * 1.25);
        }
      }
    }
  });

  it("carries the balloon about a knight and a third high, and none once it is popped", () => {
    const top = (balloon) => area(draw((pen) => drawKnight(pen, 300, 400, 100, knight({ balloon }), THEME, 0))).top;
    expect(top(1)).toBeLessThan(400 - 100 * BALLOON_LIFT);
    expect(top(0)).toBeGreaterThan(400 - 100 * BALLOON_LIFT);
  });

  it("faces the other way when flipped, sword towards the middle", () => {
    const left = area(draw((pen) => drawKnight(pen, 300, 400, 100, knight({ pose: "strike", progress: 1 }), THEME, 0)));
    const right = area(draw((pen) => drawKnight(pen, 300, 400, 100, knight({ pose: "strike", progress: 1, flip: true }), THEME, 0)));
    expect(left.right - 300).toBeGreaterThan(300 - left.left);
    expect(300 - right.left).toBeCloseTo(left.right - 300, 0);
  });

  it("swings the sword down towards the other knight as the strike goes", () => {
    const start = tipOf(300, 400, 100, knight({ pose: "strike", progress: 0 }));
    const end = tipOf(300, 400, 100, knight({ pose: "strike", progress: 1 }));
    expect(end.x).toBeGreaterThan(start.x);
    expect(end.y).toBeGreaterThan(start.y);
    expect(tipOf(300, 400, 100, knight({ pose: "strike", progress: 1, flip: true })).x).toBeCloseTo(600 - end.x, 6);
  });

  it("draws each pose its own way", () => {
    const seen = new Set(POSES.map((pose) => shapes(draw((pen) => drawKnight(pen, 300, 400, 100, knight({ pose, progress: 0.5 }), THEME, 0))).join("|")));
    expect(seen.size).toBe(POSES.length);
  });
});
