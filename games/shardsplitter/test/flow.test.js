import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { phones, settle } from "../../../kit/test/helpers.js";
import { fitting, makeGame, myTurn, tap, targetOf } from "./harness.js";

const both = (one, two) => settle([one.game.relay.table, two.game.relay.table]);

async function friends() {
  const { a, b } = phones();
  const one = await makeGame({ core: a, opening: { live: true } });
  const two = await makeGame({ core: b, opening: { live: true } });
  return { one, two, a, b };
}

async function turn(one, two) {
  await both(one, two);
  for (const side of [one, two]) await side.later(2600, 100);
  await both(one, two);
}

async function playing() {
  const made = await friends();
  const { one, two } = made;
  await tap(one.game, targetOf(one.game, "play"));
  await both(one, two);
  await tap(two.game, targetOf(two.game, "play"));
  await turn(one, two);
  return made;
}

async function playOut(one, two) {
  for (let step = 0; step < 80 && (one.game.state.screen === "play" || two.game.state.screen === "play"); step += 1) {
    const mover = [one, two].find((side) => side.game.state.screen === "play" && myTurn(side.game) && !side.game.state.round.core.over);
    if (mover) await tap(mover.game, targetOf(mover.game, "hit", fitting(mover.game)[0]));
    await turn(one, two);
  }
}

describe("with a friend", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] }));
  afterEach(() => vi.useRealTimers());

  it("says nothing when the game opens, and calls the friend only when the player starts", async () => {
    const { one, a } = await friends();
    expect(a.ft.live.send).not.toHaveBeenCalled();
    await tap(one.game, targetOf(one.game, "play"));
    expect(a.ft.live.send).toHaveBeenCalled();
    expect(one.game.state.screen).toBe("home");
  });

  it("puts both on the same golems once both have pressed play, each with a hand of their own", async () => {
    const { one, two } = await playing();
    expect([one.game.state.screen, two.game.state.screen]).toEqual(["play", "play"]);
    const [mine, theirs] = [one.game.state.round, two.game.state.round];
    expect(mine.kind).toBe("friend");
    expect(mine.code).toBe(theirs.code);
    expect(mine.mySide).toBe(1 - theirs.mySide);
    const hands = (game) => game.targets().filter((target) => target.kind === "hit").map((target) => target.value);
    expect(hands(one.game)).toEqual(mine.core.hands[mine.mySide]);
    expect(hands(two.game)).toEqual(mine.core.hands[theirs.mySide]);
    expect(myTurn(one.game)).toBe(!myTurn(two.game));
  });

  it("shows a hit on the other phone as the teammate's swing, and takes none out of turn", async () => {
    const { one, two } = await playing();
    const [mover, waiter] = myTurn(one.game) ? [one, two] : [two, one];
    await tap(waiter.game, targetOf(waiter.game, "hit", waiter.game.state.round.core.hands[waiter.game.state.round.mySide][0]));
    expect(waiter.game.state.round.hits).toEqual([]);
    const divisor = fitting(mover.game)[0];
    await tap(mover.game, targetOf(mover.game, "hit", divisor));
    expect(mover.game.state.round.hits).toEqual([divisor]);
    await turn(one, two);
    expect(waiter.game.state.round.hits).toEqual([divisor]);
    expect(waiter.game.state.round.swings[1]).toMatchObject({ miss: false });
    expect(waiter.game.state.round.core).toEqual(mover.game.state.round.core);
  });

  it("ends the round on both phones with the same stars, and the next one comes when both ask for it", async () => {
    const { one, two } = await playing();
    const first = one.game.state.round.id;
    await playOut(one, two);
    expect([one.game.state.screen, two.game.state.screen]).toEqual(["end", "end"]);
    expect(one.game.state.outcome).toMatchObject({ stars: 3, team: true });
    expect(two.game.state.outcome.stars).toBe(3);
    await tap(one.game, targetOf(one.game, "again"));
    await turn(one, two);
    await tap(two.game, targetOf(two.game, "again"));
    await turn(one, two);
    expect([one.game.state.screen, two.game.state.screen]).toEqual(["play", "play"]);
    expect(one.game.state.round.id).not.toBe(first);
    expect(one.game.state.round.code).toBe(two.game.state.round.code);
    expect(one.game.state.round.hits).toEqual([]);
  }, 60_000);

  it("goes on where the team was when a player leaves the round and comes back", async () => {
    const { one, two } = await playing();
    const [mover, waiter] = myTurn(one.game) ? [one, two] : [two, one];
    await tap(mover.game, targetOf(mover.game, "hit", fitting(mover.game)[0]));
    await turn(one, two);
    await tap(waiter.game, targetOf(waiter.game, "pause"));
    await tap(waiter.game, targetOf(waiter.game, "home"));
    expect(waiter.game.state.screen).toBe("home");
    await tap(waiter.game, targetOf(waiter.game, "play"));
    await turn(one, two);
    expect(waiter.game.state.screen).toBe("play");
    expect(waiter.game.state.round.hits).toEqual(mover.game.state.round.hits);
  });
});
