import { describe, expect, it } from "vitest";
import { draw } from "../../../kit/test/canvas/recorder.js";
import { drawFrame } from "../src/frame.js";
import { THEME } from "../src/theme.js";
import { makeGame, tap } from "./harness.js";

const frame = (game) => draw((ctx) => drawFrame(ctx, game, THEME, 1));

describe("each frame", () => {
  it("clears the canvas and draws the screen the game is on, without a word on it but the kit's own pick screen", async () => {
    const { game } = await makeGame({ opening: { solo: true } });
    const screens = [];
    const check = () => {
      const ctx = frame(game);
      expect(ctx.calls[0].op, game.state.screen).toBe("clearRect");
      if (game.state.screen !== "avatar") expect(ctx.calls.filter((call) => call.op === "fillText"), game.state.screen).toEqual([]);
      expect(ctx.depth, game.state.screen).toBe(0);
      screens.push(game.state.screen);
    };
    check();
    await tap(game, "play");
    check();
    await tap(game, "tile", "cat");
    check();
    await tap(game, "back");
    await tap(game, "back");
    await tap(game, "variant", "free");
    await tap(game, "play");
    check();
    await tap(game, "back");
    await tap(game, "looks");
    check();
    await tap(game, "back");
    await tap(game, "avatar");
    check();
    expect(screens).toEqual(["home", "shelf", "page", "free", "gallery", "avatar"]);
  });
});
