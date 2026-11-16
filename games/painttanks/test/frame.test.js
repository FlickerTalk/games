import { describe, expect, it } from "vitest";
import { draw } from "../../../kit/test/canvas/recorder.js";
import { drawFrame, sceneryOf } from "../src/frame.js";
import { THEME } from "../src/theme.js";
import { SCENERIES } from "../src/world.js";
import { makeGame, playRound, tap, targetOf } from "./harness.js";

const frame = (game, time = 0.5) => draw((ctx) => drawFrame(ctx, game, THEME, time));

describe("a frame", () => {
  it("clears the canvas first and draws every screen, leaving the context as it found it", async () => {
    const { game, later } = await makeGame({ opening: { chat: undefined } });
    const seen = [];
    const look = () => {
      const ctx = frame(game);
      expect(ctx.calls[0].op).toBe("clearRect");
      expect(ctx.depth).toBe(0);
      expect(ctx.calls.length).toBeGreaterThan(20);
      seen.push(game.state.looks ? `looks:${game.state.looks}` : game.state.screen);
    };
    look();
    await tap(game, targetOf(game, "looks"));
    look();
    for (let kind = 0; kind < 4; kind += 1) {
      await tap(game, targetOf(game, "look", kind));
      look();
      await tap(game, targetOf(game, "done"));
    }
    await tap(game, targetOf(game, "done"));
    await tap(game, targetOf(game, "avatar"));
    look();
    await tap(game, targetOf(game, "profile", "ari"));
    await tap(game, targetOf(game, "done"));
    await tap(game, targetOf(game, "play"));
    look();
    await playRound(game, later);
    look();
    expect(seen).toEqual(["home", "looks", "looks:tank", "looks:ship", "looks:sub", "looks:ball", "avatar", "play", "end"]);
  }, 60_000);

  it("draws every battlefield's round, the friend's seat and Flick's", async () => {
    for (const field of ["land", "sea", "coast", "deep"]) {
      const { game, later } = await makeGame({ opening: { solo: true } });
      await tap(game, targetOf(game, "variant", field));
      await tap(game, targetOf(game, "play"));
      await later(300);
      expect(frame(game).depth).toBe(0);
    }
    const { game } = await makeGame({ opening: { live: true } });
    expect(frame(game).calls.length).toBeGreaterThan(20);
  });

  it("picks a scenery from the round's seed: meadow, dunes or snow", () => {
    const found = new Set(["AAAAAAAA", "BbBbBbBb", "zz0099__", "Qwerty12", "abcdefgh", "-_-_-_-_"].map((seed) => sceneryOf(seed)));
    for (const one of found) expect(SCENERIES).toContain(one);
    expect(found.size).toBeGreaterThan(1);
  });
});
