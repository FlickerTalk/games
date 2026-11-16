import { describe, expect, it } from "vitest";
import { bounds, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { drawHome, drawLooks } from "../src/home-art.js";
import { LIGHT, SIZES, gameAt, paint, texts } from "./screens.js";

describe("the home screen", () => {
  it("draws the face, the looks and the play button inside the frame, with no words", async () => {
    for (const [width, height, fill] of SIZES) {
      const { game } = await gameAt("home", { width, height, fill });
      const ctx = paint((pen) => drawHome(pen, game.state, null, LIGHT, 1));
      const box = bounds(painted(ctx));
      expect(box.right).toBeLessThanOrEqual(width + 2);
      expect(box.bottom).toBeLessThanOrEqual(height + 2);
      for (const text of texts(ctx)) expect(text).toMatch(/^\d+$/);
      expect(ctx.depth).toBe(0);
    }
  });

  it("gives the teammate a seat when played with FlickerTalk or a friend", async () => {
    const { game } = await gameAt("home", { opening: { solo: true } });
    const alone = paint((pen) => drawHome(pen, game.state, null, LIGHT, 1));
    const seated = paint((pen) => drawHome(pen, game.state, { player: { who: "flick" }, here: true, calling: false, away: false }, LIGHT, 1));
    expect(shapes(seated).length).toBeGreaterThan(shapes(alone).length);
  });
});

describe("the looks screen", () => {
  it("shows the mallets and the places, the ones still to come wrapped", async () => {
    const { game } = await gameAt("home");
    game.state.screen = "looks";
    const mallets = paint((pen) => drawLooks(pen, game.state, LIGHT, 1));
    game.state.looks = "place";
    const places = paint((pen) => drawLooks(pen, game.state, LIGHT, 1));
    expect(shapes(mallets)).not.toEqual(shapes(places));
    expect(texts(mallets)).toEqual([]);
    expect(texts(places)).toEqual([]);
    expect(mallets.depth).toBe(0);
    game.state.progress = { ...game.state.progress, received: ["ice", "candy"] };
    expect(shapes(paint((pen) => drawLooks(pen, game.state, LIGHT, 1)))).not.toEqual(shapes(places));
  });
});
