import { describe, expect, it } from "vitest";
import { COUNTDOWN } from "../src/rounds.js";
import { bodyOf } from "../src/touch.js";
import { makeGame, press, targetOf } from "./harness.js";

describe("fingers on the play screen", () => {
  it("leave the bar's buttons to the bar: a touch on pause pauses and charges nothing", async () => {
    const { game, later } = await makeGame({ opening: { solo: true } });
    await press(game, "play");
    await later(COUNTDOWN + 100);
    await press(game, "pause");
    expect(game.state.paused).toBe(true);
    expect(game.state.round.match.bodies[0]).toMatchObject({ down: false, hold: -1 });
  });

  it("keep charging while any finger of the player is still down", async () => {
    const { game, later } = await makeGame({ opening: { solo: true } });
    await press(game, "play");
    await later(COUNTDOWN + 100);
    const me = bodyOf(game.state.round, 0);
    game.pointer({ type: "down", x: 60, y: 400, id: 1 });
    game.pointer({ type: "down", x: 200, y: 500, id: 2 });
    await later(200);
    game.pointer({ type: "up", x: 60, y: 400, id: 1 });
    await later(200);
    expect(me.hold).toBeGreaterThan(30);
    game.pointer({ type: "cancel", x: 200, y: 500, id: 2 });
    await later(50);
    expect(me.hold).toBe(-1);
  });

  it("offer the second button only when two share the device", async () => {
    const { game } = await makeGame({ opening: { solo: true } });
    await press(game, "play");
    expect(targetOf(game, "dash", 0)).toBeDefined();
    expect(targetOf(game, "dash", 1)).toBeUndefined();
  });
});
