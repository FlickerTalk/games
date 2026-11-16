import { describe, expect, it } from "vitest";
import { dailySeed } from "../src/rounds.js";
import { anyMove, drag, makeGame, memoryStore, tap, targetOf } from "./harness.js";

describe("starting and keeping rounds", () => {
  it("deals the small court one piece at a time on a six by six court", async () => {
    const { game } = await makeGame();
    await tap(game, targetOf(game, "variant", "small"));
    await tap(game, targetOf(game, "play"));
    expect(game.state.round.court.size).toBe(6);
    expect(game.state.layout.slots).toHaveLength(1);
    expect(game.state.layout.court.size).toBe(6);
  });

  it("deals the big court nine by nine", async () => {
    const { game } = await makeGame();
    await tap(game, targetOf(game, "variant", "big"));
    await tap(game, targetOf(game, "play"));
    expect(game.state.round.court.size).toBe(9);
  });

  it("deals the court of the day from the date alone, the same for everyone that day", async () => {
    expect(dailySeed(new Date(2030, 4, 6, 9))).toBe(dailySeed(new Date(2030, 4, 6, 23)));
    expect(dailySeed(new Date(2030, 4, 6))).not.toBe(dailySeed(new Date(2030, 4, 7)));
    const one = await makeGame({ seed: 1 });
    const two = await makeGame({ seed: 99 });
    for (const { game } of [one, two]) {
      await tap(game, targetOf(game, "variant", "daily"));
      await tap(game, targetOf(game, "play"));
    }
    expect(one.game.state.round.trays).toEqual(two.game.state.round.trays);
  });

  it("deals new trays for each round of the main court", async () => {
    const one = await makeGame({ seed: 1 });
    const two = await makeGame({ seed: 99 });
    for (const { game } of [one, two]) await tap(game, targetOf(game, "play"));
    expect(one.game.state.round.trays).not.toEqual(two.game.state.round.trays);
  });

  it("keeps a round under way in the store, and opens it again where it was", async () => {
    const store = memoryStore();
    const first = await makeGame({ store, opening: { solo: true } });
    await tap(first.game, targetOf(first.game, "play"));
    await drag(first.game, ...anyMove(first.game.state.round));
    await drag(first.game, ...anyMove(first.game.state.round));
    const kept = first.game.state.round;
    const again = await makeGame({ store, core: first.core, opening: { solo: true } });
    await tap(again.game, targetOf(again.game, "play"));
    expect(again.game.state.round.placements).toEqual(kept.placements);
    expect(again.game.state.round.court).toEqual(kept.court);
    expect(again.game.state.flick.round.trays).toEqual(kept.trays);
  });
});
