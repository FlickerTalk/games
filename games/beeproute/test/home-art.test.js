import { describe, expect, it } from "vitest";
import { bounds, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { drawHome, drawLooks } from "../src/home-art.js";
import { LIGHT, SIZES, gameAt, paint, texts } from "./screens.js";

describe("the home screen", () => {
  it("draws the two choices, the face, the looks and the play button inside the frame, with no words", async () => {
    for (const [width, height, fill] of SIZES) {
      const { game } = await gameAt("home", { width, height, fill });
      const ctx = paint((pen) => drawHome(pen, game.state, null, LIGHT, 1));
      const box = bounds(painted(ctx));
      expect(box.right).toBeLessThanOrEqual(width + 2);
      expect(box.bottom).toBeLessThanOrEqual(height + 2);
      expect(texts(ctx)).toEqual([]);
      expect(ctx.depth).toBe(0);
    }
  });

  it("gives Flick a seat when played against FlickerTalk", async () => {
    const { game } = await gameAt("home", { opening: { solo: true } });
    const alone = paint((pen) => drawHome(pen, game.state, null, LIGHT, 1));
    const seated = paint((pen) => drawHome(pen, game.state, { player: { who: "flick" }, here: true, calling: false, away: false }, LIGHT, 1));
    expect(shapes(seated).length).toBeGreaterThan(shapes(alone).length);
  });

  it("marks the choice to make a level when a friend's level or solution is waiting", async () => {
    const { game } = await gameAt("home");
    const plain = paint((pen) => drawHome(pen, game.state, null, LIGHT, 1, "build"));
    const waiting = paint((pen) => drawHome(pen, game.state, null, LIGHT, 1, "solve"));
    expect(shapes(waiting).length).toBeGreaterThan(shapes(plain).length);
  });
});

describe("the looks screen", () => {
  it("shows the robots and the worlds, the ones still to come wrapped", async () => {
    const { game } = await gameAt("home");
    game.state.screen = "looks";
    const robots = paint((pen) => drawLooks(pen, game.state, LIGHT, 1));
    game.state.looks = "world";
    const worlds = paint((pen) => drawLooks(pen, game.state, LIGHT, 1));
    expect(shapes(robots)).not.toEqual(shapes(worlds));
    expect(texts(robots)).toEqual([]);
    expect(robots.depth).toBe(0);
  });
});
