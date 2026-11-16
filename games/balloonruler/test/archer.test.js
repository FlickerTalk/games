import { describe, expect, it } from "vitest";
import { FLICK, PROFILES } from "../../../kit/src/avatars/index.js";
import { bounds, colours, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { POSES, TIPS, arrowAt, bowAt, drawArcher, drawArrow, drawPlanted, drawTip, faceFor } from "../src/archer.js";
import { THEME } from "../src/theme.js";

const { art } = THEME;
const PLAYER = { who: PROFILES[2].id, hair: "none", hairColour: "brown", name: "" };

describe("the archer", () => {
  it("is the player's own face on a plain body in their colour, holding a toy bow, inside its box in every pose", () => {
    for (const pose of POSES) {
      for (const flip of [false, true]) {
        const ctx = draw((pen) => drawArcher(pen, 200, 700, 140, { player: PLAYER, pose, time: 1.3, flip, aim: -0.6 }, THEME));
        const seen = colours(ctx);
        expect(seen, pose).toContain(PROFILES[2].colour);
        expect(seen, pose).toContain(art.arrow.bow);
        const box = bounds(painted(ctx));
        expect(box.left, pose).toBeGreaterThanOrEqual(200 - 140 * 0.52);
        expect(box.right, pose).toBeLessThanOrEqual(200 + 140 * 0.52);
        expect(box.top, pose).toBeGreaterThanOrEqual(700 - 140 * 1.05);
        expect(box.bottom, pose).toBeLessThanOrEqual(700 + 1);
        expect(ctx.depth, pose).toBe(0);
      }
    }
  });

  it("is Flick the robot when the phone plays", () => {
    expect(colours(draw((pen) => drawArcher(pen, 200, 700, 120, { player: { who: "flick" }, pose: "idle", time: 0 }, THEME)))).toContain(FLICK.colour);
  });

  it("looks focused while aiming, cheers a close shot and is only surprised by a far one", () => {
    expect(faceFor("aiming")).toBe("focused");
    expect(faceFor("cheer")).toBe("cheering");
    expect(faceFor("oops")).toBe("surprised");
    expect(faceFor("unknown")).toBe(faceFor("idle"));
  });

  it("holds the bow on the side it faces", () => {
    const right = bowAt({ x: 200, y: 700, size: 140, flip: false });
    const left = bowAt({ x: 200, y: 700, size: 140, flip: true });
    expect(right.x).toBeGreaterThan(200);
    expect(left.x).toBeCloseTo(400 - right.x);
    expect(right.y).toBeLessThan(700);
    expect(right.y).toBeGreaterThan(700 - 140);
  });
});

describe("the arrow", () => {
  const from = { x: 100, y: 600 };
  const to = { x: 300, y: 400 };

  it("flies in an arc from the bow to where the player touched", () => {
    expect(arrowAt(from, to, 0)).toMatchObject(from);
    expect(arrowAt(from, to, 1)).toMatchObject(to);
    const middle = arrowAt(from, to, 0.5);
    expect(middle.y).toBeLessThan(500);
    expect(middle.x).toBeCloseTo(200);
    expect(arrowAt(from, to, 7)).toMatchObject(to);
  });

  it("ends in a toy tip: a suction cup, a cork or a flower, each drawn its own way", () => {
    expect(TIPS).toEqual(["suction", "cork", "flower"]);
    const drawn = TIPS.map((tip) => draw((pen) => drawTip(pen, 50, 50, 30, tip, THEME)));
    expect(colours(drawn[0])).toContain(art.arrow.suction);
    expect(colours(drawn[1])).toContain(art.arrow.cork);
    expect(colours(drawn[2])).toContain(art.arrow.petal);
    expect(draw((pen) => drawTip(pen, 50, 50, 30, "sword", THEME)).calls).toEqual(drawn[0].calls);
  });

  it("is drawn with its shaft and feather on the way, and standing on the ruler once it has landed", () => {
    const flying = draw((pen) => drawArrow(pen, from, to, 0.5, { tip: "suction", scale: 1 }, THEME));
    expect(colours(flying)).toContain(art.arrow.shaft);
    expect(colours(flying)).toContain(art.arrow.feather);
    expect(colours(draw((pen) => drawArrow(pen, from, to, 0.5, { tip: "cork", scale: 1, rival: true }, THEME)))).toContain(art.arrow.rivalFeather);
    const planted = draw((pen) => drawPlanted(pen, 300, 500, { tip: "suction", scale: 1 }, THEME));
    const box = bounds(painted(planted));
    expect(box.bottom).toBeLessThanOrEqual(500.5);
    expect(box.top).toBeLessThan(460);
    expect(Math.abs((box.left + box.right) / 2 - 300)).toBeLessThan(4);
    expect(planted.depth).toBe(0);
  });
});
