import { describe, expect, it } from "vitest";
import { bounds, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { drawBuild } from "../src/build-art.js";
import { paintAt } from "../src/touch.js";
import { LIGHT, SIZES, gameAt, paint, texts } from "./screens.js";

const at = (game, time = 1) => paint((ctx) => drawBuild(ctx, game.state, LIGHT, time));

describe("the build screen", () => {
  it("draws the level being made, the tools and the send button inside the frame, with no words", async () => {
    for (const [width, height, fill] of SIZES) {
      const { game } = await gameAt("build", { width, height, fill });
      const ctx = at(game);
      const box = bounds(painted(ctx));
      expect(box.right, `${width}x${height}`).toBeLessThanOrEqual(width + 2);
      expect(box.bottom, `${width}x${height}`).toBeLessThanOrEqual(height + 2);
      expect(ctx.depth).toBe(0);
      for (const text of texts(ctx)) expect(text).toMatch(/^\d+$/);
    }
  });

  it("shows what was painted, which tool is in the hand, and dims the send button while the level cannot be finished", async () => {
    const { game } = await gameAt("build");
    const blank = shapes(at(game));
    paintAt(game, 14);
    expect(shapes(at(game))).not.toEqual(blank);
    const wall = shapes(at(game));
    game.state.build.tool = "goal";
    expect(shapes(at(game))).not.toEqual(wall);
    const alphas = (ctx) => ctx.calls.filter((call) => call.op === "set" && call.name === "globalAlpha" && call.value === 0.4).length;
    const ready = alphas(at(game));
    game.state.build.check = { ok: false, best: null };
    expect(alphas(at(game))).toBeGreaterThan(ready);
  });
});
