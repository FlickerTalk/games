import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { phones, settle } from "../../../kit/test/helpers.js";
import { shortest } from "../src/solver.js";
import { makeGame, solve, tap, targetOf } from "./harness.js";

const coin = vi.hoisted(() => ({ first: null }));

vi.mock("../../../kit/src/commit.js", async (importOriginal) => {
  const real = await importOriginal();
  const coinToss = (...args) => (coin.first === null ? real.coinToss(...args) : Promise.resolve(coin.first === "creator" ? 0 : 1));
  return { ...real, coinToss };
});

async function both(one, two) {
  await settle([one.game.relay.table, two.game.relay.table]);
  await Promise.all([one.game.idle(), two.game.idle()]);
}

async function friends() {
  const { a, b } = phones();
  const one = await makeGame({ core: a, opening: { live: true } });
  const two = await makeGame({ core: b, opening: { live: true } });
  for (const side of [one, two]) await tap(side.game, targetOf(side.game, "variant", "make"));
  return { one, two, a, b };
}

async function make(side) {
  expect(side.game.state.screen).toBe("build");
  await tap(side.game, targetOf(side.game, "tool", "battery"));
  await tap(side.game, targetOf(side.game, "cell", 12));
  await tap(side.game, targetOf(side.game, "send"));
}

describe("with a friend", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] }));
  afterEach(() => {
    vi.useRealTimers();
    coin.first = null;
  });

  it("says nothing when the game opens, and calls the friend only when the player starts", async () => {
    const { one, a } = await friends();
    expect(a.ft.live.send).not.toHaveBeenCalled();
    await tap(one.game, targetOf(one.game, "play"));
    expect(a.ft.live.send).toHaveBeenCalled();
    expect(one.game.state.screen).toBe("home");
  });

  it("takes the player from one press of play to the build screen when the coin has them make the first level", async () => {
    coin.first = "creator";
    const { one, two } = await friends();
    await tap(one.game, targetOf(one.game, "play"));
    await both(one, two);
    expect(one.game.relay.duty()).toBe("build");
    expect(one.game.state.screen).toBe("build");
  });

  it("keeps the player who pressed play waiting while the friend makes the first level, then opens it as it arrives", async () => {
    coin.first = "joiner";
    const { one, two } = await friends();
    await tap(one.game, targetOf(one.game, "play"));
    await both(one, two);
    expect(one.game.state.screen).toBe("home");
    await tap(two.game, targetOf(two.game, "play"));
    await make(two);
    await both(one, two);
    expect(one.game.state.screen).toBe("play");
    expect(one.game.state.round).toMatchObject({ kind: "friend", maker: "friend" });
    expect(one.game.state.round.level.cells[12]).toBe("B");
  });

  it("one makes a level, the other solves it, and the maker watches the solution", async () => {
    coin.first = "creator";
    const { one: maker, two: solver } = await friends();
    await tap(maker.game, targetOf(maker.game, "play"));
    await both(maker, solver);
    await make(maker);
    await both(maker, solver);
    expect(maker.game.state.screen).toBe("home");
    expect(maker.game.relay.duty()).toBe("wait");
    await tap(solver.game, targetOf(solver.game, "play"));
    expect(solver.game.state.round).toMatchObject({ kind: "friend", maker: "friend" });
    expect(solver.game.state.round.level.cells[12]).toBe("B");
    await solve(solver.game, solver.later);
    expect(solver.game.state.screen).toBe("end");
    expect(solver.game.state.outcome.kind).toBe("friend");
    await both(maker, solver);
    expect(maker.game.relay.duty()).toBe("watch");
    await tap(maker.game, targetOf(maker.game, "play"));
    expect(maker.game.state.round).toMatchObject({ kind: "watch", driver: "friend" });
    await maker.later(60_000, 100);
    expect(maker.game.state.screen).toBe("end");
    expect(maker.game.state.outcome).toMatchObject({ kind: "watch", count: shortest(maker.game.state.round.level).length });
    expect(solver.game.relay.duty()).toBe("build");
    await tap(solver.game, targetOf(solver.game, "again"));
    expect(solver.game.state.screen).toBe("build");
  }, 60_000);
});
