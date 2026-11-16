import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { phones, settle } from "../../../kit/test/helpers.js";
import { makeGame, playOut, shootAt, targetOf, truth, wholeShot } from "./harness.js";

const both = (...sides) => settle(sides.map((side) => side.game.duel.table));
const centre = (area) => ({ x: area.x + area.w / 2, y: area.y + area.h / 2 });

async function start(side, other) {
  const button = targetOf(side.game, "play") ?? targetOf(side.game, "again");
  side.game.pointer({ type: "down", ...centre(button), id: 1 });
  side.game.pointer({ type: "up", ...centre(button), id: 1 });
  await both(side, other);
  await side.game.idle();
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("playing with a friend, each on their own phone", () => {
  it("says nothing until the player starts, then both get the same numbers and compare their scores at the end", async () => {
    const { a, b } = phones();
    const one = await makeGame({ core: a, opening: { live: true } });
    const two = await makeGame({ core: b, opening: { live: true } });
    expect(a.sent).toEqual([]);
    await start(one, two);
    await start(two, one);
    expect(one.game.state.screen).toBe("play");
    expect(two.game.state.round.seed).toBe(one.game.state.round.seed);
    expect(two.game.state.round.numbers).toEqual(one.game.state.round.numbers);
    expect(one.game.state.round.rival).toBe(false);

    const view = one.game.duel.table.view;
    const [first, second] = view.rounds[0].starter === view.me ? [one, two] : [two, one];
    await playOut(first.game, first.later);
    await both(one, two);
    shootAt(second.game, truth(second.game) > 0.5 ? 0.02 : 0.98);
    await second.later(600);
    expect(second.game.state.last.ghost).toBeCloseTo(first.game.state.round.guesses[0], 6);
    await second.later(wholeShot);
    await playOut(second.game, second.later, (share) => (share > 0.5 ? share - 0.1 : share + 0.1));
    await both(one, two);
    await both(one, two);

    expect(first.game.state.screen).toBe("end");
    const index = first.game.state.outcome.duelIndex;
    expect(first.game.duel.results(index).theirs.score).toBe(second.game.state.outcome.score);
    expect(second.game.duel.results(index).theirs.score).toBe(first.game.state.outcome.score);
    expect(first.game.duel.results(index).winner).toBe("me");
  });

  it("offers the friend's seat on the home screen to call them again", async () => {
    const { a } = phones();
    const { game } = await makeGame({ core: a, opening: { live: true } });
    expect(targetOf(game, "rival")).toBeTruthy();
  });
});
