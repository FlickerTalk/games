import { describe, expect, it } from "vitest";
import { bounds, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { RINGS } from "../src/levels.js";
import { POSES, drawArrow, drawPlayer, drawRingIcon } from "../src/players.js";
import { THEME } from "../src/theme.js";

const ME = { who: "ari", hair: "none", hairColour: "ink" };
const figure = (options) => draw((pen) => drawPlayer(pen, 200, 400, 80, ME, THEME, { ring: "coral", time: 1, ...options }));
const tall = (ctx) => {
  const area = bounds(painted(ctx));
  return area.bottom - area.top;
};

describe("a player on the platform", () => {
  it("stands on its feet in its ring, within its own height above them and a ring's width to each side", () => {
    for (const who of [ME, { who: "flick" }]) {
      const ctx = draw((pen) => drawPlayer(pen, 200, 400, 80, who, THEME, { ring: "aqua", pose: "idle", time: 0.3 }));
      const area = bounds(painted(ctx));
      expect(area.bottom).toBeLessThanOrEqual(400 + 80 * 0.2);
      expect(area.top).toBeGreaterThanOrEqual(400 - 80 * 1.3);
      expect(area.left).toBeGreaterThanOrEqual(200 - 80 * 0.62);
      expect(area.right).toBeLessThanOrEqual(200 + 80 * 0.62);
      expect(ctx.depth).toBe(0);
      expect(ctx.calls.some((call) => call.op === "fillText")).toBe(false);
    }
  });

  it("has a drawing of its own for every thing it does", () => {
    const seen = new Set(POSES.map((pose) => shapes(figure({ pose, charge: 0.8 })).join("\n")));
    expect(seen.size).toBe(POSES.length);
    for (const pose of POSES) expect(figure({ pose }).depth, pose).toBe(0);
  });

  it("squashes down as it charges and shows only above its ring in the water, with an umbrella over the sky instead", () => {
    expect(tall(figure({ pose: "charging", charge: 1 }))).toBeLessThan(tall(figure({ pose: "idle" })) * 0.85);
    expect(figure({ pose: "swim" }).calls.some((call) => call.op === "clip")).toBe(true);
    expect(figure({ pose: "idle" }).calls.some((call) => call.op === "clip")).toBe(false);
    expect(figure({ pose: "falling", place: "cloud" }).calls.length).toBeGreaterThan(figure({ pose: "falling", place: "pond" }).calls.length);
  });

  it("wears the ring it is given, the four told apart by their marks as well as their colour", () => {
    const seen = new Set(RINGS.map((ring) => shapes(draw((pen) => drawRingIcon(pen, { x: 0, y: 0, w: 100, h: 100 }, ring, THEME))).join("\n")));
    expect(seen.size).toBe(RINGS.length);
    const area = bounds(painted(draw((pen) => drawRingIcon(pen, { x: 10, y: 20, w: 100, h: 100 }, "sunny", THEME))));
    expect(area.left).toBeGreaterThanOrEqual(10);
    expect(area.right).toBeLessThanOrEqual(110);
    expect(area.bottom).toBeLessThanOrEqual(120);
  });

  it("shows its arrow on the ground in front of it, flattened like the platform, longer as the dash charges, this player's a solid head and the other's hollow", () => {
    const tip = (aim, options = {}) => bounds(painted(draw((pen) => drawArrow(pen, 200, 400, 80, aim, THEME, { mine: true, ...options }))));
    const right = tip({ x: 1, y: 0 });
    const down = tip({ x: 0, y: 1 });
    expect(right.right - 200).toBeGreaterThan((down.bottom - 400) * 1.4);
    expect(tip({ x: 1, y: 0 }, { charge: 1 }).right).toBeGreaterThan(right.right + 10);
    const mine = shapes(draw((pen) => drawArrow(pen, 200, 400, 80, { x: 1, y: 0 }, THEME, { mine: true }))).join("\n");
    const theirs = shapes(draw((pen) => drawArrow(pen, 200, 400, 80, { x: 1, y: 0 }, THEME, { mine: false }))).join("\n");
    expect(mine).not.toBe(theirs);
  });
});
