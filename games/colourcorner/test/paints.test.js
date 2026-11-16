import { describe, expect, it } from "vitest";
import { PATTERNS, isPaint, paintOf, paintToken } from "../src/paints.js";
import { PAINT_KEYS } from "../src/theme.js";

describe("a paint", () => {
  it("is a colour of the palette, or a pattern drawn in one, or a pattern of its own colours", () => {
    expect(PATTERNS).toEqual(["dots", "stripes", "stars", "rainbow", "glitter"]);
    expect(paintOf("5")).toEqual({ colour: 5, pattern: null });
    expect(paintOf("d3")).toEqual({ colour: 3, pattern: "dots" });
    expect(paintOf("s0")).toEqual({ colour: 0, pattern: "stripes" });
    expect(paintOf("t12")).toEqual({ colour: 12, pattern: "stars" });
    expect(paintOf("r")).toEqual({ colour: null, pattern: "rainbow" });
    expect(paintOf("g")).toEqual({ colour: null, pattern: "glitter" });
  });

  it("is written as a short token that goes back to the same paint", () => {
    for (const token of ["0", "23", "d1", "s7", "t22", "r", "g"]) expect(paintToken(paintOf(token))).toBe(token);
    expect(paintToken({ colour: 4, pattern: "stars" })).toBe("t4");
    expect(paintToken({ colour: 4, pattern: "rainbow" })).toBe("r");
  });

  it("refuses anything else", () => {
    for (const token of [String(PAINT_KEYS.length), "-1", "05", "x1", "d", "rr", "", null, 4, "1.5", " 3", "d99"]) {
      expect(paintOf(token), String(token)).toBeNull();
      expect(isPaint(token), String(token)).toBe(false);
    }
    expect(isPaint("7")).toBe(true);
  });
});
