import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { phones, settle } from "../../../kit/test/helpers.js";
import { mayPick } from "../src/flow.js";
import { FINISH } from "../src/rules.js";
import { makeGame, tap, targetOf } from "./harness.js";

const both = (...sides) => settle(sides.map((side) => side.game.duel.table));

async function press(side, other, kind) {
  const area = targetOf(side.game, kind);
  const point = { x: area.x + area.w / 2, y: area.y + area.h / 2 };
  side.game.pointer({ type: "down", ...point });
  side.game.pointer({ type: "up", ...point });
  await both(side, other);
  await side.game.idle();
  await both(side, other);
}

async function tick(one, two, ms) {
  await one.later(ms);
  await two.later(ms);
  await both(one, two);
}

async function racing() {
  const { a, b } = phones();
  const one = await makeGame({ core: a, opening: { live: true } });
  const two = await makeGame({ core: b, opening: { live: true } });
  await press(one, two, "play");
  await press(two, one, "play");
  await tick(one, two, 100);
  return { one, two, a, b };
}

async function playRound(one, two) {
  for (let turns = 0; turns < 300 && one.game.state.screen === "play"; turns += 1) {
    const mover = [one, two].find((side) => mayPick(side.game, side.now()));
    if (mover) {
      const die = targetOf(mover.game, "die", turns % 2);
      mover.game.pointer({ type: "down", x: die.x + 5, y: die.y + 5 });
      mover.game.pointer({ type: "up", x: die.x + 5, y: die.y + 5 });
    }
    await tick(one, two, 400);
  }
  await tick(one, two, 3000);
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("racing with a friend, each on their own phone", () => {
  it("says nothing until the player starts, and does not start the other player's round for them", async () => {
    const { a, b } = phones();
    const one = await makeGame({ core: a, opening: { live: true } });
    const two = await makeGame({ core: b, opening: { live: true } });
    expect(a.sent).toEqual([]);
    expect(b.sent).toEqual([]);
    await press(one, two, "play");
    expect(one.game.state.screen).toBe("play");
    expect(two.game.state.screen).toBe("home");
    expect(two.game.duel.status.invited).toBe(true);
    expect(one.game.state.round.dice).toBeNull();
    expect(targetOf(one.game, "die")).toBeUndefined();
  });

  it("gives both phones the same dice, and the first turn to one of them only", async () => {
    const { one, two } = await racing();
    const [mine, theirs] = [one.game.state.round, two.game.state.round];
    expect(mine.dice).toEqual(theirs.dice);
    expect(mine.dice).toHaveLength(2);
    expect(mine.me).toBe(1 - theirs.me);
    await tick(one, two, 700);
    expect([mayPick(one.game, one.now()), mayPick(two.game, two.now())].sort()).toEqual([false, true]);
  });

  it("plays a whole race turn by turn to the same finish on both phones, each awarding its own round", { timeout: 60_000 }, async () => {
    const { one, two } = await racing();
    await playRound(one, two);
    expect(one.game.state.screen).toBe("end");
    expect(two.game.state.screen).toBe("end");
    const [mine, theirs] = [one.game.state.outcome, two.game.state.outcome];
    expect(mine.won).toBe(!theirs.won);
    expect([mine.mine, mine.theirs]).toEqual([theirs.theirs, theirs.mine]);
    expect(Math.max(mine.mine, mine.theirs)).toBe(FINISH);
    expect(mine.stars).toBeGreaterThanOrEqual(1);
    expect(JSON.parse(one.store.kept.get("progress")).level).toBe(mine.won ? 2 : 1);
  });

  it("starts another round from the end card, the other player starting it", { timeout: 60_000 }, async () => {
    const { one, two } = await racing();
    const first = one.game.state.round.me;
    await playRound(one, two);
    await press(one, two, "again");
    await press(two, one, "again");
    await tick(one, two, 100);
    expect(one.game.state.screen).toBe("play");
    expect(one.game.state.round.me).toBe(1 - first);
    expect(one.game.state.round.picks).toEqual([]);
    expect(one.game.state.round.dice).toEqual(two.game.state.round.dice);
  });

  it("comes back to the race where it was after going home", async () => {
    const { one, two } = await racing();
    await tick(one, two, 700);
    const mover = mayPick(one.game, one.now()) ? one : two;
    const other = mover === one ? two : one;
    await tap(mover.game, targetOf(mover.game, "die", 0));
    await tick(one, two, 100);
    await tick(one, two, 4000);
    const race = structuredClone(other.game.state.round.race);
    await tap(other.game, targetOf(other.game, "pause"));
    await tap(other.game, targetOf(other.game, "home"));
    await both(one, two);
    expect(other.game.state.screen).toBe("home");
    await press(other, mover, "play");
    await tick(one, two, 100);
    expect(race.turn).toBe(1);
    expect(other.game.state.round.race).toEqual(race);
  });

  it("offers the friend's seat on the home screen to call them again", async () => {
    const { a } = phones();
    const { game } = await makeGame({ core: a, opening: { live: true } });
    expect(targetOf(game, "rival")).toBeTruthy();
  });
});
