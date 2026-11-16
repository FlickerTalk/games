import { describe, expect, it } from "vitest";
import { bounds, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { drawEnd } from "../src/end-art.js";
import { LIGHT, SIZES, fonts, gameAt, paint, texts } from "./screens.js";

describe("the star screen", () => {
  it("shows the stars, the round's mark and the best one, with no words, inside the frame", async () => {
    for (const [width, height, fill] of SIZES) {
      const { game } = await gameAt("end", { width, height, fill });
      expect(game.state.screen).toBe("end");
      const ctx = paint((pen) => drawEnd(pen, game.state, LIGHT, 3));
      const box = bounds(painted(ctx));
      expect(box.right).toBeLessThanOrEqual(width + 2);
      expect(box.bottom).toBeLessThanOrEqual(height + 2);
      for (const text of texts(ctx)) expect(text).toMatch(/^\d+$/);
      expect(texts(ctx)).toContain(String(game.state.outcome.score));
      expect(Math.min(...fonts(ctx))).toBeGreaterThanOrEqual(20);
      expect(ctx.depth).toBe(0);
    }
  }, 60_000);

  it("shows the teammate cheering beside the player after a round as a team", async () => {
    const alone = await gameAt("end");
    const team = await gameAt("end", { opening: { solo: true } });
    const count = (made) => shapes(paint((pen) => drawEnd(pen, made.game.state, LIGHT, 3))).length;
    expect(count(team)).toBeGreaterThan(count(alone));
  }, 60_000);

  it("draws a wrapped gift until it is opened, then the look it held", async () => {
    const { game } = await gameAt("end");
    game.state.outcome = { ...game.state.outcome, gift: "ice", opened: false };
    const wrapped = shapes(paint((pen) => drawEnd(pen, game.state, LIGHT, 3)));
    game.state.outcome.opened = true;
    expect(shapes(paint((pen) => drawEnd(pen, game.state, LIGHT, 3)))).not.toEqual(wrapped);
  }, 60_000);
});
