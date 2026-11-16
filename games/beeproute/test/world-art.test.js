import { describe, expect, it } from "vitest";
import { bounds, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { WORLDS, drawWorld } from "../src/world-art.js";
import { THEME } from "../src/theme.js";

const AREA = { x: 0, y: 40, w: 384, h: 600 };

describe("the worlds behind the board", () => {
  it("are the workshop floor, the garden and the space station, each with its own look", () => {
    expect(WORLDS).toEqual(["workshop", "garden", "space"]);
    const drawn = WORLDS.map((world) => shapes(draw((ctx) => drawWorld(ctx, world, AREA, THEME, 1))).join("\n"));
    expect(new Set(drawn).size).toBe(3);
  });

  it("fill the area they are given and draw nothing outside it", () => {
    for (const world of WORLDS) {
      const ctx = draw((one) => drawWorld(one, world, AREA, THEME, 2));
      const box = bounds(painted(ctx));
      expect(box.left, world).toBeGreaterThanOrEqual(-2);
      expect(box.top, world).toBeGreaterThanOrEqual(AREA.y - 2);
      expect(box.right, world).toBeLessThanOrEqual(AREA.w + 2);
      expect(box.bottom, world).toBeLessThanOrEqual(AREA.y + AREA.h + 2);
      expect(ctx.calls.some((call) => call.op === "fillRect")).toBe(true);
      expect(ctx.depth).toBe(0);
    }
  });
});
