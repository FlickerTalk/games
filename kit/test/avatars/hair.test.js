import { describe, expect, it } from "vitest";
import { HAIRS } from "../../src/avatars/cast.js";
import { drawHairBack, drawHairFront } from "../../src/avatars/hair.js";
import { colours, draw, shapes } from "../canvas/recorder.js";

const both = (hair, options = {}, colour = "#C9693F") =>
  draw((ctx) => {
    drawHairBack(ctx, hair, colour, options);
    drawHairFront(ctx, hair, colour, options);
  });

describe("the hair", () => {
  it("draws nothing for no hair, and something of its own for every other hairstyle", () => {
    expect(both("none").calls).toEqual([]);
    const looks = HAIRS.filter((hair) => hair.id !== "none").map((hair) => JSON.stringify(shapes(both(hair.id))));
    for (const [at, look] of looks.entries()) expect(JSON.parse(look).length, HAIRS[at + 1].id).toBeGreaterThan(2);
    expect(new Set(looks).size).toBe(HAIRS.length - 1);
  });

  it("is filled with the colour it is given, the cap keeping its own", () => {
    for (const hair of HAIRS.filter((one) => one.id !== "none")) expect(colours(both(hair.id, {}, "#E9B84C")), hair.id).toContain("#E9B84C");
    expect(colours(both("cap", {}, "#E9B84C"))).toContain("#4F9BE8");
  });

  it("swings with time where it hangs loose, more in a fast move, and keeps a short crop still", () => {
    for (const hair of ["ponytail", "braids", "long-braid", "long-fringe"]) {
      expect(shapes(both(hair, { time: 0.6 })), hair).not.toEqual(shapes(both(hair, { time: 0 })));
      expect(shapes(both(hair, { time: 0, motion: 1 })), hair).not.toEqual(shapes(both(hair, { time: 0 })));
    }
    expect(shapes(both("short-crop", { time: 0.6 }))).toEqual(shapes(both("short-crop", { time: 0 })));
  });

  it("draws nothing for a hairstyle it does not know", () => {
    for (const unknown of [undefined, "afro", "constructor"]) expect(both(unknown).calls, String(unknown)).toEqual([]);
  });

  it("leaves the context as it found it", () => {
    for (const hair of HAIRS) {
      const ctx = both(hair.id, { time: 1, motion: 0.5 });
      expect(ctx.depth, hair.id).toBe(0);
      expect(ctx.matrix, hair.id).toEqual([1, 0, 0, 1, 0, 0]);
    }
  });
});
