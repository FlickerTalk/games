import { describe, expect, it } from "vitest";
import { bounds, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { tokensFor } from "../../../kit/test/canvas/themes.js";
import { ROBOTS } from "../src/levels.js";
import { POSES, drawRobot, faceFor } from "../src/robots.js";
import { THEME, themeFor } from "../src/theme.js";

const ME = { who: "ari", hair: "none", hairColour: "ink" };
const robot = (options = {}, theme = THEME) => draw((pen) => drawRobot(pen, 200, 400, 140, theme, { variant: "round", colour: "sun", pose: "idle", time: 0, ...options }));
const area = (options) => bounds(painted(robot(options)));

describe("the robots", () => {
  it("come in six shapes, each in nine poses, drawn around their feet with save and restore paired", () => {
    expect(POSES).toEqual(["idle", "walkA", "walkB", "glove", "kick", "shield", "hit", "dizzy", "cheer"]);
    for (const variant of ROBOTS) {
      for (const pose of POSES) {
        const ctx = robot({ variant, pose, player: ME });
        const found = bounds(painted(ctx));
        const name = `${variant} ${pose}`;
        expect(ctx.depth, name).toBe(0);
        expect(found.left, name).toBeGreaterThanOrEqual(200 - 140 * 0.5);
        expect(found.right, name).toBeLessThanOrEqual(200 + 140 * 0.95);
        expect(found.top, name).toBeGreaterThanOrEqual(400 - 140 * 1.3);
        expect(found.bottom, name).toBeLessThanOrEqual(400 + 140 * 0.2);
      }
    }
  });

  it("are told apart by their outline, not their colour", () => {
    const outlines = ROBOTS.map((variant) => shapes(robot({ variant })).join("|"));
    expect(new Set(outlines).size).toBe(ROBOTS.length);
    expect(area({ variant: "tall" }).top).toBeLessThan(area({ variant: "round" }).top);
    expect(area({ variant: "bigHead" }).top).toBeLessThan(area({ variant: "tall" }).top);
    expect(shapes(robot({ colour: "sun" }))).toEqual(shapes(robot({ colour: "grape" })));
  });

  it("face the other way mirrored around their feet", () => {
    const right = area({ pose: "glove" });
    const left = area({ pose: "glove", facing: -1 });
    expect(left.left).toBeCloseTo(400 - right.right, 4);
    expect(left.right).toBeCloseTo(400 - right.left, 4);
  });

  it("reach forward with the glove on its spring and with the boot, further than standing", () => {
    const idle = area({ pose: "idle" }).right;
    expect(area({ pose: "glove", reach: 1 }).right).toBeGreaterThan(idle + 40);
    expect(area({ pose: "glove", reach: 1 }).right).toBeGreaterThan(area({ pose: "glove", reach: 0 }).right + 20);
    expect(area({ pose: "kick" }).right).toBeGreaterThan(idle + 25);
  });

  it("sit down with stars circling when dizzy, and raise their arms to cheer", () => {
    expect(robot({ pose: "dizzy" }).calls.length).toBeGreaterThan(robot({ pose: "hit" }).calls.length);
    expect(shapes(robot({ pose: "dizzy", time: 0 }))).not.toEqual(shapes(robot({ pose: "dizzy", time: 0.3 })));
    expect(shapes(robot({ pose: "cheer" }))).not.toEqual(shapes(robot({ pose: "idle" })));
  });

  it("carry the player's round face on their screen, clipped to it and never mirrored", () => {
    const blank = robot();
    const faced = robot({ player: ME });
    expect(faced.calls.length).toBeGreaterThan(blank.calls.length + 10);
    expect(faced.calls.filter((call) => call.op === "clip")).toHaveLength(1);
    const mirrored = robot({ player: ME, facing: -1 });
    const emblem = (ctx) => ctx.calls.filter((call) => call.op === "clip").length;
    expect(emblem(mirrored)).toBe(1);
    expect(shapes(robot({ player: { who: "flick" } }))).not.toEqual(shapes(faced));
  });

  it("show on the face what the pose is about", () => {
    expect(faceFor("idle")).toBe("confident");
    expect(faceFor("hit")).toBe("surprised");
    expect(faceFor("dizzy")).toBe("dizzy");
    expect(faceFor("cheer")).toBe("laughing");
    for (const pose of POSES) expect(typeof faceFor(pose), pose).toBe("string");
  });

  it("get a light rim around their dark outline on a dark page", () => {
    const dark = themeFor(tokensFor("mono-dark"), { dark: true });
    const strokes = (ctx) => ctx.calls.filter((call) => call.op === "stroke").length;
    expect(strokes(robot({}, dark))).toBeGreaterThan(strokes(robot()));
  });
});
