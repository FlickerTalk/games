import { describe, expect, it } from "vitest";
import { bounds, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { LOOKS } from "../src/levels.js";
import { drawPlace } from "../src/place-art.js";
import { THEME } from "../src/theme.js";

const AREA = { x: 0, y: 0, w: 384, h: 800 };
const place = (name, area = AREA, ground = 600) => draw((ctx) => drawPlace(ctx, name, area, ground, THEME));

describe("the places", () => {
  it("are three sceneries that fill the frame down to the ground and below it, without a word", () => {
    const drawn = LOOKS.place.map((name) => place(name));
    expect(new Set(drawn.map((ctx) => shapes(ctx).join("\n"))).size).toBe(3);
    for (const ctx of drawn) {
      const box = bounds(painted(ctx));
      expect(box.left).toBeLessThanOrEqual(0);
      expect(box.right).toBeGreaterThanOrEqual(384);
      expect(box.bottom).toBeGreaterThanOrEqual(800);
      expect(ctx.calls.filter((call) => call.op === "fillText")).toEqual([]);
      expect(ctx.depth).toBe(0);
    }
  });

  it("fall back on the workshop, and fit a small card as well as a wide screen", () => {
    expect(shapes(place("nowhere")).join("\n")).toBe(shapes(place("workshop")).join("\n"));
    for (const name of LOOKS.place) {
      const small = bounds(painted(place(name, { x: 20, y: 30, w: 90, h: 90 }, 100)));
      expect(small.left).toBeGreaterThanOrEqual(-20);
      expect(small.right).toBeLessThanOrEqual(150);
      expect(place(name, { x: 0, y: 0, w: 1280, h: 748 }, 560).depth).toBe(0);
    }
  });
});
