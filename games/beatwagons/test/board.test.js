import { describe, expect, it } from "vitest";
import { bounds, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { FLICK } from "../../../kit/src/avatars/index.js";
import { driverOf, drawPlay, rivalOf } from "../src/board.js";
import { DARK, LIGHT, SIZES, gameAt, paint, texts } from "./screens.js";
import { rightIndex, tap, targetOf, until, wrongIndex } from "./harness.js";

const play = (game, theme = LIGHT, time = undefined, now = 0) => paint((ctx) => drawPlay(ctx, game.state, theme, time ?? now / 1000));
const lines = (ctx) => shapes(ctx).join("\n");

describe("the play screen", () => {
  it("draws no words and stays inside the frame at every size, the drawing state left as it was found", async () => {
    for (const [width, height, fill] of SIZES) {
      const made = await gameAt("play", { width, height, fill });
      const ctx = play(made.game, LIGHT, made.now() / 1000);
      expect(texts(ctx).filter((text) => /[^\d\s.,]/.test(text)), `${width}x${height}`).toEqual([]);
      expect(ctx.depth).toBe(0);
      const { train, band } = made.game.state.layout;
      const wagons = bounds(ctx.calls.filter((call) => call.op === "arcTo").flatMap((call) => call.points).filter(([, y]) => y > band.y && y < train.y + train.size * 0.6));
      expect(wagons.left, `${width}x${height}`).toBeGreaterThanOrEqual(-1);
      expect(wagons.right, `${width}x${height}`).toBeLessThanOrEqual(width + 1);
    }
  });

  it("shows the train with its gap dashed, and the siding's wagons under it", async () => {
    const made = await gameAt("play");
    const ctx = play(made.game, LIGHT, made.now() / 1000);
    expect(ctx.calls.some((call) => call.op === "setLineDash" && call.segments.length === 2)).toBe(true);
    const { cells } = made.game.state.layout;
    const low = painted(ctx).filter(([, y]) => y > cells[0].y && y < cells[0].y + cells[0].h);
    expect(low.length).toBeGreaterThan(100);
  });

  it("rolls the train in from the left before it can be completed", async () => {
    const made = await gameAt("arriving");
    const arriving = play(made.game, LIGHT, made.now() / 1000);
    await until(made, (state) => state.round.phase === "solve");
    const standing = play(made.game, LIGHT, made.now() / 1000);
    expect(lines(arriving)).not.toBe(lines(standing));
  });

  it("carries a tapped wagon to the gap, wobbles a wrong one there and rolls it back", async () => {
    const made = await gameAt("play");
    const { game } = made;
    const before = lines(play(game, LIGHT, made.now() / 1000));
    await tap(game, targetOf(game, "candidate", wrongIndex(game.state.round)));
    await made.later(150);
    const flying = lines(play(game, LIGHT, made.now() / 1000));
    await until(made, (state) => Boolean(state.round.back));
    await made.later(100);
    const wobbling = lines(play(game, LIGHT, made.now() / 1000));
    expect(new Set([before, flying, wobbling]).size).toBe(3);
  });

  it("makes the engine dance and the wagons hop one after another while the tune plays", async () => {
    const made = await gameAt("tune");
    const one = lines(play(made.game, LIGHT, made.now() / 1000));
    await made.later(480);
    const two = lines(play(made.game, LIGHT, made.now() / 1000));
    expect(one).not.toBe(two);
  });

  it("shows the teaching hand going from the right wagon to the gap, and nothing of it once paused", async () => {
    const made = await gameAt("play");
    const { game } = made;
    expect(game.state.hint).not.toBeNull();
    const hinted = play(game, LIGHT, made.now() / 1000).calls.length;
    game.state.hint = null;
    expect(play(game, LIGHT, made.now() / 1000).calls.length).toBeLessThan(hinted);
  });

  it("gives every dark outline a light rim on a dark page", async () => {
    const made = await gameAt("play");
    const strokes = (ctx) => ctx.calls.filter((call) => call.op === "stroke").length;
    expect(strokes(play(made.game, DARK, made.now() / 1000))).toBeGreaterThan(strokes(play(made.game, LIGHT, made.now() / 1000)));
  });

  it("puts Flick at the window and in the bar when Flick made or completes the train, and the player otherwise", async () => {
    const alone = await gameAt("play");
    expect(rivalOf(alone.game.state)).toBeNull();
    expect(driverOf(alone.game.state).pilot).toBe(alone.game.state.player);
    const flick = await gameAt("play", { opening: { solo: true } });
    expect(rivalOf(flick.game.state)).toMatchObject({ player: { who: FLICK.id } });
    expect(driverOf(flick.game.state).pilot).toBe(flick.game.state.player);
    flick.game.state.round.driver = "flick";
    expect(driverOf(flick.game.state)).toMatchObject({ pilot: { who: FLICK.id } });
    expect(rightIndex(flick.game.state.round)).toBeGreaterThanOrEqual(0);
  });
});
