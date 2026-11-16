import { describe, expect, it } from "vitest";
import { draw } from "../../../kit/test/canvas/recorder.js";
import { drawFrame } from "../src/frame.js";
import { THEME } from "../src/theme.js";
import { makeGame, playRound, tap, targetOf } from "./harness.js";

const frame = (game) => draw((ctx) => drawFrame(ctx, game, THEME, 0.7));
const digits = (ctx) => ctx.calls.filter((call) => call.op === "fillText").map((call) => call.text);

describe("the round's end", () => {
  it("shows both players' scores after a battle against Flick, and the stars", async () => {
    const { game, later } = await makeGame({ opening: { solo: true } });
    await tap(game, targetOf(game, "play"));
    await playRound(game, later);
    expect(game.state.screen).toBe("end");
    const ctx = frame(game);
    expect(ctx.depth).toBe(0);
    const { outcome } = game.state;
    expect(digits(ctx)).toEqual(expect.arrayContaining([String(outcome.score), String(outcome.rival.score)]));
  }, 60_000);

  it("draws a wrapped gift when one is won, and its look once it is opened", async () => {
    const { game, later } = await makeGame({ opening: { chat: undefined } });
    await tap(game, targetOf(game, "play"));
    await playRound(game, later);
    game.state.outcome = { ...game.state.outcome, gift: "snail", opened: false };
    const wrapped = frame(game).calls.length;
    await tap(game, targetOf(game, "gift"));
    expect(game.state.outcome.opened).toBe(true);
    expect(frame(game).calls.length).not.toBe(wrapped);
  }, 60_000);
});
