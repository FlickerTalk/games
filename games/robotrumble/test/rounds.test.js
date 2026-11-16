import { describe, expect, it } from "vitest";
import { energyOf, lampsOf } from "../src/bout.js";
import { COUNTDOWN, IMPACT_MS, leftOf, scoreAt, toldOf, windowOf } from "../src/rounds.js";
import { choose, makeGame, press } from "./harness.js";

async function playing(opening = { solo: true }) {
  const made = await makeGame({ opening });
  if (made.game.state.mode === "alone") await press(made.game, "variant", "pair");
  await press(made.game, "play");
  await made.later(COUNTDOWN + 100);
  return made;
}

describe("a round's clock", () => {
  it("opens a window to choose in, closes it, shows the moves and opens the next one", async () => {
    const { game, later } = await playing();
    const { round } = game.state;
    const { window, period } = round.settings;
    expect(windowOf(round)).toMatchObject({ index: 0, open: true });
    expect(windowOf(round).left).toBeGreaterThan(0.8);
    await later(window);
    expect(windowOf(round)).toMatchObject({ index: 0, open: false, left: 0 });
    await later(period - window);
    expect(windowOf(round)).toMatchObject({ index: 1, open: true });
  });

  it("runs the time line down to nothing over the round", async () => {
    const { game, later } = await playing();
    expect(leftOf(game.state.round)).toBeGreaterThan(0.95);
    await later(10_000);
    expect(leftOf(game.state.round)).toBeLessThan(0.75);
  });

  it("empties a battery when the hit lands, not before", async () => {
    const { game, later } = await playing({ chat: undefined });
    choose(game, "g", 0);
    await later(game.state.round.settings.window);
    const { round } = game.state;
    expect(round.shown.landed).toEqual([1, 0]);
    expect(energyOf(scoreAt(round, round.shown.at + IMPACT_MS - 50), 1)).toBe(3);
    expect(energyOf(scoreAt(round, round.shown.at + IMPACT_MS + 50), 1)).toBe(2);
  });

  it("topples a robot at the third hit, lights a lamp for the other and winds the toppled one up again", async () => {
    const { game, later } = await playing({ chat: undefined });
    const { period } = game.state.round.settings;
    for (let at = 0; at < 3; at += 1) {
      choose(game, "b", 1);
      await later(period);
    }
    const { round } = game.state;
    expect(round.bout.hits).toEqual([0, 3]);
    expect(round.shown.toppled).toBe(0);
    expect(lampsOf(round.bout.hits, 1)).toBe(1);
    expect(energyOf(round.bout.hits, 0)).toBe(3);
  });

  it("tells the other phone a move only some time after its window has closed", async () => {
    const { game, later } = await playing();
    const { round } = game.state;
    const { window } = round.settings;
    choose(game, "g");
    await later(window - 150);
    expect(toldOf(round)).toEqual([]);
    await later(100);
    expect(round.mine).toEqual(["g"]);
    expect(toldOf(round)).toEqual([]);
    await later(150);
    expect(toldOf(round)).toEqual(["g"]);
  });
});
