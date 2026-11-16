import { describe, expect, it } from "vitest";
import { shapes } from "../../../kit/test/canvas/recorder.js";
import { drawHome, drawLooks } from "../src/home-art.js";
import { LOOKS } from "../src/levels.js";
import { DARK, LIGHT, SIZES, gameAt, paint, texts } from "./screens.js";
import { tap, targetOf } from "./harness.js";

const lines = (ctx) => shapes(ctx).join("\n");

describe("the home screen", () => {
  it("draws no words at any size, in light and dark, and leaves the drawing state as it found it", async () => {
    for (const [width, height, fill] of SIZES) {
      const { game } = await gameAt("home", { width, height, fill });
      for (const theme of [LIGHT, DARK]) {
        const ctx = paint((pen) => drawHome(pen, game.state, null, theme, 1));
        expect(texts(ctx), `${width}x${height}`).toEqual([]);
        expect(ctx.depth).toBe(0);
        expect(ctx.calls.length).toBeGreaterThan(200);
      }
    }
  });

  it("shows the two ways to play as pictures: a train with a gap, and loose wagons to compose with", async () => {
    const { game } = await gameAt("home");
    const levels = lines(paint((pen) => drawHome(pen, game.state, null, LIGHT, 1)));
    game.state.variant = "make";
    expect(lines(paint((pen) => drawHome(pen, game.state, null, LIGHT, 1)))).not.toBe(levels);
  });

  it("seats the rival and marks the compose card when a friend's train is waiting", async () => {
    const { game } = await gameAt("home", { opening: { solo: true } });
    const seat = { player: { who: "flick" }, here: true, calling: false, away: false };
    const plain = paint((pen) => drawHome(pen, game.state, seat, LIGHT, 1)).calls.length;
    expect(paint((pen) => drawHome(pen, game.state, seat, LIGHT, 1, "solve")).calls.length).toBeGreaterThan(plain);
  });
});

describe("the looks screen", () => {
  it("draws every engine the player owns, wraps the ones still to come, and shows the stations on their tab", async () => {
    const { game } = await gameAt("home");
    await tap(game, targetOf(game, "looks"));
    const engines = paint((pen) => drawLooks(pen, game.state, LIGHT, 1));
    expect(texts(engines)).toEqual([]);
    expect(engines.depth).toBe(0);
    expect(engines.calls.filter((call) => call.op === "clip").length).toBe(LOOKS.engine.length - 2 + 1);
    await tap(game, targetOf(game, "tab", "scenery"));
    const stations = paint((pen) => drawLooks(pen, game.state, LIGHT, 1));
    expect(lines(stations)).not.toBe(lines(engines));
  });
});
