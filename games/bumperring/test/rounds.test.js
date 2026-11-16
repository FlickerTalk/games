import { describe, expect, it } from "vitest";
import { COUNTDOWN, END_PAUSE, leftOf } from "../src/rounds.js";
import { makeGame, press } from "./harness.js";

describe("a round on this phone", () => {
  it("lasts as long as its level says, its time line running down, and waits a moment on its last splash before the card", async () => {
    const { game, later } = await makeGame({ opening: { solo: true } });
    await press(game, "play");
    const { round } = game.state;
    expect(round.settings).toMatchObject({ level: 1, seconds: 35, variant: "plain" });
    expect(leftOf(round)).toBe(1);
    await later(COUNTDOWN + 3500);
    expect(leftOf(round)).toBeGreaterThan(0.85);
    expect(leftOf(round)).toBeLessThan(0.95);
    round.match.roundSteps = round.match.step + 10;
    await later(300);
    expect(round.match.over).toBe(true);
    expect(game.state.screen).toBe("play");
    await later(END_PAUSE + 100);
    expect(game.state.screen).toBe("end");
    expect(game.state.outcome).toMatchObject({ mine: 0, theirs: 0, won: false, stars: 1 });
  });

  it("gives the players different rings, Flick its own, and the place the player chose", async () => {
    const { game } = await makeGame({ opening: { solo: true } });
    await press(game, "looks");
    await press(game, "look", 1);
    await press(game, "done");
    await press(game, "play");
    const { round } = game.state;
    expect(round.place).toBe("pool");
    expect(round.looks).toEqual(["coral", "aqua"]);
  });
});
