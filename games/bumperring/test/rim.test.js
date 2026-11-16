import { describe, expect, it } from "vitest";
import { draw } from "../../../kit/test/canvas/recorder.js";
import { tokensFor } from "../../../kit/test/canvas/themes.js";
import { circle } from "../../../kit/src/canvas/pen.js";
import { rimmed } from "../src/rim.js";
import { THEME, themeFor } from "../src/theme.js";

const strokes = (theme) => draw((pen) => rimmed(pen, theme, () => circle(pen, 10, 10, 5, theme.art.white, theme.art.ink, 3))).calls.filter((call) => call.op === "stroke").length;

describe("the outline on a dark page", () => {
  it("gets a thin light rim around every dark outline, and none on a light page", () => {
    expect(strokes(THEME)).toBe(1);
    expect(strokes(themeFor(tokensFor("mono-dark"), { dark: true }))).toBe(2);
  });
});
