import { describe, expect, it } from "vitest";
import { bounds, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { drawPlay } from "../src/board.js";
import { DARK, LIGHT, SIZES, gameAt, paint, texts } from "./screens.js";

const at = (game, theme = LIGHT, time = 1) => paint((ctx) => drawPlay(ctx, game.state, theme, time));

describe("the play screen", () => {
  it("draws the world, the board, the robot, the strip and the controls inside the frame, with no words", async () => {
    for (const [width, height, fill] of SIZES) {
      const { game } = await gameAt("play", { width, height, fill });
      const ctx = at(game);
      const box = bounds(painted(ctx));
      expect(box.left, `${width}x${height}`).toBeGreaterThanOrEqual(-2);
      expect(box.right, `${width}x${height}`).toBeLessThanOrEqual(width + 2);
      expect(box.bottom, `${width}x${height}`).toBeLessThanOrEqual(height + 2);
      expect(ctx.depth).toBe(0);
      for (const text of texts(ctx)) expect(text, `${width}x${height}`).toMatch(/^\d+$/);
    }
  });

  it("turns the play button into a stop button while the robot runs, and lights the running slot", async () => {
    const still = await gameAt("play");
    const running = await gameAt("running");
    expect(shapes(at(running.game))).not.toEqual(shapes(at(still.game)));
  });

  it("dims the commands while Flick types, so the player watches", async () => {
    const { game } = await gameAt("play");
    const mine = at(game);
    game.state.round.driver = "flick";
    const alphas = (ctx) => ctx.calls.filter((call) => call.op === "set" && call.name === "globalAlpha" && call.value === 0.4).length;
    expect(alphas(at(game))).toBeGreaterThan(alphas(mine));
  });

  it("shows the teaching hand over the button to press", async () => {
    const { game } = await gameAt("play");
    expect(game.state.hint).not.toBeNull();
    const shown = at(game);
    game.state.hint = null;
    expect(shapes(shown).length).toBeGreaterThan(shapes(at(game)).length);
  });

  it("keeps its shapes in a dark theme, adding a light rim around the outlines", async () => {
    const { game } = await gameAt("play");
    expect(shapes(at(game, DARK)).length).toBeGreaterThan(shapes(at(game, LIGHT)).length);
  });
});
