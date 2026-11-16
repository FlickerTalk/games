import { describe, expect, it } from "vitest";
import { shapes } from "../../../kit/test/canvas/recorder.js";
import { drawCompose } from "../src/compose-art.js";
import { LIGHT, SIZES, gameAt, paint, texts } from "./screens.js";
import { tap, targetOf } from "./harness.js";

const compose = (made, theme = LIGHT) => paint((ctx) => drawCompose(ctx, made.game.state, theme, made.now() / 1000));
const lines = (ctx) => shapes(ctx).join("\n");

describe("the compose screen", () => {
  it("draws no words at any size and leaves the drawing state as it found it", async () => {
    for (const [width, height, fill] of SIZES) {
      const made = await gameAt("build", { width, height, fill, opening: { solo: true } });
      const ctx = compose(made);
      expect(texts(ctx), `${width}x${height}`).toEqual([]);
      expect(ctx.depth).toBe(0);
    }
  });

  it("shows the train as it grows, a hidden wagon as a dashed outline of itself", async () => {
    const empty = await gameAt("home", { opening: { solo: true } });
    await tap(empty.game, targetOf(empty.game, "variant", "make"));
    await tap(empty.game, targetOf(empty.game, "play"));
    const built = await gameAt("build", { opening: { solo: true } });
    expect(lines(compose(built))).not.toBe(lines(compose(empty)));
    const dashes = (ctx) => ctx.calls.filter((call) => call.op === "setLineDash" && call.segments.length === 2).length;
    const hidden = dashes(compose(built));
    await tap(built.game, targetOf(built.game, "slot", 3));
    expect(dashes(compose(built))).toBeLessThan(hidden);
  });

  it("dims the send button until the train can go, and draws the palette with the beats the next wagon will carry", async () => {
    const made = await gameAt("build", { opening: { solo: true } });
    const ready = compose(made);
    await tap(made.game, targetOf(made.game, "slot", 3));
    const alphas = (ctx) => ctx.calls.filter((call) => call.op === "set" && call.name === "globalAlpha" && call.value === 0.45).length;
    expect(alphas(compose(made))).toBeGreaterThan(alphas(ready));
    const before = lines(compose(made));
    await tap(made.game, targetOf(made.game, "dots"));
    expect(lines(compose(made))).not.toBe(before);
  });

  it("plays the tune on the screen when composing alone: the engine dances and the notes pop", async () => {
    const made = await gameAt("build");
    const still = lines(compose(made));
    await tap(made.game, targetOf(made.game, "send"));
    await made.later(300);
    expect(lines(compose(made))).not.toBe(still);
  });
});
