import { describe, expect, it } from "vitest";
import { standIn } from "../../../kit/src/avatars/index.js";
import { drawLobby } from "../../../kit/src/duel/lobby.js";
import { contains, shapes } from "../../../kit/test/canvas/recorder.js";
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

  it("marks the compose card the same way when it is this player's turn to compose a train", async () => {
    const { game } = await gameAt("home");
    const solve = shapes(paint((pen) => drawHome(pen, game.state, null, LIGHT, 1, "solve")));
    expect(shapes(paint((pen) => drawHome(pen, game.state, null, LIGHT, 1, "build")))).toEqual(solve);
  });

  it("turns dots in the play button while the player who pressed play waits for the friend, and not once the friend is gone or the next step is theirs", async () => {
    const { game } = await gameAt("home", { opening: { live: true } });
    const seat = { player: standIn(game.state.player), here: true, calling: false, away: false };
    const dots = shapes(paint((pen) => drawLobby(pen, { play: targetOf(game, "play") }, { waiting: true, invited: false }, LIGHT.ui, 1)));
    const shows = (duty, at = seat) => contains(shapes(paint((pen) => drawHome(pen, game.state, at, LIGHT, 1, duty))), dots);
    expect(shows("wait")).toBe(false);
    game.state.wanting = true;
    expect(shows("wait")).toBe(true);
    expect(shows("wait", { ...seat, here: false, away: true })).toBe(false);
    for (const duty of ["build", "solve", "watch"]) expect(shows(duty), duty).toBe(false);
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
