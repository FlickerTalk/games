import { describe, expect, it } from "vitest";
import { drawEnd } from "../src/end-art.js";
import { LIGHT, gameAt, paint, texts } from "./screens.js";

describe("the end of a round", () => {
  it("shows the stars, the level as digits and nothing else written, with one big button to play again", async () => {
    const made = await gameAt("end");
    expect(made.game.state.screen).toBe("end");
    const ctx = paint((pen) => drawEnd(pen, made.game.state, LIGHT, made.now() / 1000));
    expect(texts(ctx)).toEqual(["1"]);
    expect(ctx.depth).toBe(0);
  }, 60_000);

  it("shows both players side by side, without a score, after a train made by one and completed by the other", async () => {
    const made = await gameAt("end", { opening: { solo: true } });
    made.game.state.outcome.kind = "flick";
    const ctx = paint((pen) => drawEnd(pen, made.game.state, LIGHT, made.now() / 1000));
    expect(texts(ctx)).toEqual([]);
    const level = paint((pen) => drawEnd(pen, { ...made.game.state, outcome: { ...made.game.state.outcome, kind: "level" } }, LIGHT, made.now() / 1000));
    expect(ctx.calls.length).not.toBe(level.calls.length);
  }, 60_000);

  it("wraps a gift until it is opened", async () => {
    const made = await gameAt("end");
    const state = { ...made.game.state, outcome: { ...made.game.state.outcome, gift: "desert", opened: false } };
    const wrapped = paint((pen) => drawEnd(pen, state, LIGHT, 1)).calls.length;
    const opened = paint((pen) => drawEnd(pen, { ...state, outcome: { ...state.outcome, opened: true } }, LIGHT, 1)).calls.length;
    expect(wrapped).not.toBe(opened);
  }, 60_000);
});
