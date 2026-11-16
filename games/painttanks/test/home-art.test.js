import { describe, expect, it } from "vitest";
import { draw, shapes } from "../../../kit/test/canvas/recorder.js";
import { drawHome, drawMiniField } from "../src/home-art.js";
import { THEME } from "../src/theme.js";
import { makeGame } from "./harness.js";

describe("the home screen's art", () => {
  it("draws each battlefield as its own small picture, inside the card it is given", () => {
    const area = { x: 20, y: 30, w: 88, h: 88 };
    const pictures = ["land", "sea", "coast", "deep"].map((field) => draw((ctx) => drawMiniField(ctx, area, field, THEME, 0.5)));
    expect(new Set(pictures.map((ctx) => shapes(ctx).join("|"))).size).toBe(4);
    for (const ctx of pictures) {
      expect(ctx.depth).toBe(0);
      expect(ctx.calls.some((call) => call.op === "clip")).toBe(true);
    }
  });

  it("shows target practice on the rival's seat when it is chosen instead of Flick", async () => {
    const { game } = await makeGame({ opening: { solo: true } });
    const flick = draw((ctx) => drawHome(ctx, game.state, { player: { who: "flick" }, here: true }, THEME, 0.5));
    const practice = draw((ctx) => drawHome(ctx, { ...game.state, practice: true }, null, THEME, 0.5));
    expect(flick.depth).toBe(0);
    expect(practice.depth).toBe(0);
    expect(shapes(practice)).not.toEqual(shapes(flick));
    expect(practice.calls.some((call) => call.op === "clip")).toBe(true);
  });
});
