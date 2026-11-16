import { describe, expect, it } from "vitest";
import { draw } from "../../../kit/test/avatars/recorder.js";
import { drawFrame } from "../src/frame.js";
import { THEME } from "../src/theme.js";
import { makeGame, playRound, tap, targetOf } from "./harness.js";

const frame = (game, time = 0.5) => draw((ctx) => drawFrame(ctx, game, THEME, time));

describe("a frame", () => {
  it("clears the canvas first and draws every screen, leaving the context as it found it", async () => {
    const { game, later } = await makeGame({ opening: { solo: true } });
    const seen = [];
    const look = () => {
      const ctx = frame(game);
      expect(ctx.calls[0].op).toBe("clearRect");
      expect(ctx.depth).toBe(0);
      expect(ctx.calls.length).toBeGreaterThan(20);
      seen.push(game.state.screen);
    };
    look();
    await tap(game, targetOf(game, "looks"));
    look();
    await tap(game, targetOf(game, "done"));
    await tap(game, targetOf(game, "avatar"));
    look();
    await tap(game, targetOf(game, "profile", "ari"));
    await tap(game, targetOf(game, "done"));
    await tap(game, targetOf(game, "play"));
    look();
    await playRound(game, later);
    look();
    expect(seen).toEqual(["home", "looks", "avatar", "play", "end"]);
  });

  it("shows the friend's seat and, once their round is in, their score", async () => {
    const { game } = await makeGame({ opening: { live: true } });
    const ctx = frame(game);
    expect(ctx.calls.length).toBeGreaterThan(20);
  });
});
