import { describe, expect, it } from "vitest";
import { shapes } from "../../../kit/test/canvas/recorder.js";
import { drawFrame } from "../src/frame.js";
import { LIGHT, gameAt, paint } from "./screens.js";

const framed = (game) => paint((ctx) => drawFrame(ctx, game, LIGHT, 1));

describe("a frame", () => {
  it("clears the canvas and draws the screen the game is on", async () => {
    const drawn = [];
    for (const screen of ["home", "play", "build", "end"]) {
      const { game } = await gameAt(screen);
      const ctx = framed(game);
      expect(ctx.calls[0].op, screen).toBe("clearRect");
      expect(ctx.depth).toBe(0);
      drawn.push(shapes(ctx).join("\n"));
    }
    expect(new Set(drawn).size).toBe(4);
  });

  it("draws the kit's pick screen for the player's face", async () => {
    const { game } = await gameAt("home");
    game.press({ kind: "avatar", value: "avatar" });
    expect(game.state.screen).toBe("avatar");
    const ctx = framed(game);
    expect(shapes(ctx).length).toBeGreaterThan(50);
    expect(ctx.depth).toBe(0);
  });

  it("seats Flick on the home screen against FlickerTalk", async () => {
    const alone = await gameAt("home");
    const flick = await gameAt("home", { opening: { solo: true } });
    expect(shapes(framed(flick.game)).length).toBeGreaterThan(shapes(framed(alone.game)).length);
  });
});
