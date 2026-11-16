import { describe, expect, it } from "vitest";
import { ENTER_MS, IMPACT_MS, LEAVE_MS, SPLIT_MS } from "../src/motion.js";
import { applyHit, pressHit } from "../src/playing.js";
import { usefulNow } from "../src/round.js";
import { jarFill } from "../src/rounds.js";
import { fitting, makeGame, played, settled, tap, targetOf } from "./harness.js";

async function onGolem(number, cap = null) {
  const made = await makeGame();
  await tap(made.game, targetOf(made.game, "play"));
  const { round } = made.game.state;
  round.core = { ...round.core, golems: [{ number, cap }, ...round.core.golems.slice(1)], value: number };
  round.stand = { value: number, count: 1, cap };
  await settled(made.game, made.later);
  return made;
}

describe("a hit that splits", () => {
  it("shows the pieces from the moment the mallet lands and frees the buttons when they have settled", async () => {
    const { game, now } = await onGolem(20);
    pressHit(game, 2);
    const { round } = game.state;
    expect(round.split).toEqual({ start: now() + IMPACT_MS, from: { value: 20, count: 1 }, to: { value: 10, count: 2 } });
    expect(round.stand).toEqual({ value: 10, count: 2, cap: null });
    expect(round.leave).toBeNull();
    expect(round.busyUntil).toBe(now() + IMPACT_MS + SPLIT_MS);
  });

  it("sends a finished golem to the jar, then rolls the next one in, and only then counts it in the jar", async () => {
    const { game, later, now, sound } = await onGolem(14);
    pressHit(game, 2);
    const { round } = game.state;
    const next = round.core.golems[1];
    expect(round.leave).toMatchObject({ value: 7, count: 2, parents: 2, ones: false });
    expect(round.next).toEqual({ value: next.number, count: 1, cap: next.cap });
    expect(jarFill(round)).toBe(0);
    await later(round.leave.start - now() + LEAVE_MS + 50);
    expect(round.leave).toBeNull();
    expect(round.stand).toEqual({ value: next.number, count: 1, cap: next.cap });
    expect(round.enter.start).toBeGreaterThan(0);
    expect(jarFill(round)).toBeCloseTo(1 / round.core.golems.length);
    expect(played(sound)).toEqual(expect.arrayContaining(["pop", "giggle", "collect"]));
    expect(game.now()).toBeLessThanOrEqual(round.busyUntil + ENTER_MS);
  });

  it("turns the last pieces into loose crystals at once when they are ones", async () => {
    const { game, now } = await onGolem(10);
    pressHit(game, 10);
    expect(game.state.round.leave).toEqual({ start: now() + IMPACT_MS, value: 1, count: 10, parents: 1, ones: true });
  });
});

describe("a hit that clinks", () => {
  it("is the capped divisor too, and after two on the same golem the hand shows a divisor that fits", async () => {
    const { game, later } = await onGolem(20, 10);
    pressHit(game, 10);
    expect(game.state.round.core.clinks).toEqual([1]);
    expect(game.state.hint).toBeNull();
    await settled(game, later);
    pressHit(game, 10);
    expect(game.state.round.struggle).toBe(2);
    expect(usefulNow(game.state.round.core, 0)).toContain(game.state.hint.divisor);
    await settled(game, later);
    pressHit(game, game.state.hint.divisor);
    expect(game.state.round.struggle).toBe(0);
    expect(game.state.hint).toBeNull();
  });
});

describe("the teammate's hit", () => {
  it("swings the other mallet and lights the divisor it used", async () => {
    const { game, later, now } = await makeGame({ opening: { solo: true } });
    await tap(game, targetOf(game, "play"));
    await settled(game, later);
    const { round } = game.state;
    round.core = { ...round.core, last: 0, golems: [{ number: 12, cap: null }, ...round.core.golems.slice(1)], value: 6, count: 2 };
    const event = applyHit(game, 1, 3, now());
    expect(event).toMatchObject({ kind: "split", side: 1 });
    expect(round.swings).toEqual([null, { start: now(), miss: false }]);
    expect(round.struck).toMatchObject({ divisor: 3 });
    expect(applyHit(game, 1, 3, now())).toBeNull();
  });
});

describe("a round that is over", () => {
  it("waits for the last crystals to land before the stars, and takes no more hits", async () => {
    const { game, later } = await makeGame();
    await tap(game, targetOf(game, "play"));
    const { round } = game.state;
    round.core = { ...round.core, golems: [{ number: 10, cap: null }], value: 10 };
    round.stand = { value: 10, count: 1, cap: null };
    await settled(game, later);
    pressHit(game, fitting(game).at(-1));
    expect(round.core.over).toBe(true);
    expect(game.state.screen).toBe("play");
    expect(round.next).toBeNull();
    await later(IMPACT_MS + LEAVE_MS + 100);
    expect(round.finished).toBe(true);
    pressHit(game, 2);
    expect(round.hits).toHaveLength(1);
    await later(1000);
    expect(game.state.screen).toBe("end");
  });
});
