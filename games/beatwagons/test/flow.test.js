import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { phones, settle } from "../../../kit/test/helpers.js";
import { encodeTrain } from "../src/train.js";
import { completeTrain, makeGame, tap, targetOf, until, wrongIndex } from "./harness.js";

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

async function compose(side, kinds = [0, 1, 0, 1], gap = 3) {
  expect(side.game.state.screen).toBe("build");
  for (const kind of kinds) await tap(side.game, targetOf(side.game, "wagon", kind));
  await tap(side.game, targetOf(side.game, "slot", gap));
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

  it("takes the player from one press of play to the composer when the coin has them make the first train", async () => {
    coin.first = "creator";
    const { one, two } = await friends();
    await tap(one.game, targetOf(one.game, "play"));
    await both(one, two);
    expect(one.game.relay.duty()).toBe("build");
    expect(one.game.state.screen).toBe("build");
  });

  it("keeps the player who pressed play waiting while the friend composes the first train, then opens it as it arrives", async () => {
    coin.first = "joiner";
    const { one, two } = await friends();
    await tap(one.game, targetOf(one.game, "play"));
    await both(one, two);
    expect(one.game.state.screen).toBe("home");
    await tap(two.game, targetOf(two.game, "play"));
    await compose(two);
    await both(one, two);
    expect(one.game.state.screen).toBe("play");
    expect(one.game.state.round).toMatchObject({ kind: "friend", maker: "friend", driver: "me" });
    expect(encodeTrain(one.game.state.round.trains[0])).toBe("TadaD");
  });

  it("one composes a train, the other completes it, and the maker watches how it went", async () => {
    coin.first = "creator";
    const { one: maker, two: solver } = await friends();
    await tap(maker.game, targetOf(maker.game, "play"));
    await both(maker, solver);
    await compose(maker);
    await both(maker, solver);
    expect(maker.game.state.screen).toBe("home");
    expect(solver.game.relay.duty()).toBe("solve");
    await tap(solver.game, targetOf(solver.game, "play"));
    expect(solver.game.state.round).toMatchObject({ kind: "friend", maker: "friend", driver: "me" });
    expect(encodeTrain(solver.game.state.round.trains[0])).toBe("TadaD");
    await until(solver, (state) => state.round.phase === "solve");
    await tap(solver.game, targetOf(solver.game, "candidate", wrongIndex(solver.game.state.round)));
    await until(solver, (state) => Boolean(state.round.back));
    await until(solver, (state) => !state.round.back);
    await completeTrain(solver);
    await until(solver, (state) => state.screen === "end");
    expect(solver.game.state.outcome).toMatchObject({ kind: "friend", stars: 2 });
    await both(maker, solver);
    expect(maker.game.relay.duty()).toBe("watch");
    await tap(maker.game, targetOf(maker.game, "play"));
    expect(maker.game.state.round).toMatchObject({ kind: "watch", driver: "friend" });
    await until(maker, (state) => state.screen === "end", 60_000);
    expect(maker.game.state.outcome).toMatchObject({ kind: "watch", wrongs: 1 });
    expect(maker.game.relay.duty()).toBe("wait");
    expect(solver.game.relay.duty()).toBe("build");
  });

  it("keeps a train that cannot be sent on the composer's screen", async () => {
    coin.first = "creator";
    const { one: maker, two, a, b } = await friends();
    await tap(maker.game, targetOf(maker.game, "play"));
    await both(maker, two);
    expect(maker.game.state.screen).toBe("build");
    const before = a.sent.length + b.sent.length;
    for (const kind of [0, 1, 2, 0, 1, 2]) await tap(maker.game, targetOf(maker.game, "wagon", kind));
    for (const gap of [2, 5]) await tap(maker.game, targetOf(maker.game, "slot", gap));
    await tap(maker.game, targetOf(maker.game, "send"));
    expect(maker.game.state.screen).toBe("build");
    expect(a.sent.length + b.sent.length).toBe(before);
  });
});
