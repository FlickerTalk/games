import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { phones, settle } from "../../../kit/test/helpers.js";
import { isFind, visitorsOf } from "../src/pond.js";
import { HOOK_X, LOWER } from "../src/round.js";
import { hold, letGo, makeGame, playOut, tap, targetOf } from "./harness.js";

const both = (...sides) => settle(sides.map((side) => side.game.duel.table));

async function start(side, other) {
  side.game.pointer({ type: "down", ...centre(targetOf(side.game, "play") ?? targetOf(side.game, "again")), id: 1 });
  side.game.pointer({ type: "up", ...centre(targetOf(side.game, "play") ?? targetOf(side.game, "again")), id: 1 });
  await both(side, other);
  await side.game.idle();
}

async function land({ game, later }, visitor) {
  const { round } = game.state;
  const depth = 0.3;
  const fish = { ...visitor, depth, speed: 1, direction: 1, enter: round.time };
  game.state.round = { ...round, visitors: [fish] };
  await later(Math.max(0, ((HOOK_X[0] + 0.14) / round.pace - depth / LOWER) * 1000));
  hold(game);
  await later((depth / LOWER + 0.4) * 1000);
  letGo(game);
  for (let step = 0; step < 40 && game.state.round.caught[0].length === 0; step += 1) await later(100);
}

const centre = (area) => ({ x: area.x + area.w / 2, y: area.y + area.h / 2 });

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("fishing with a friend, each on their own phone", () => {
  it("says nothing until the player starts, then both fish the same water as a team and share one album", async () => {
    const { a, b } = phones();
    const one = await makeGame({ core: a, opening: { live: true } });
    const two = await makeGame({ core: b, opening: { live: true } });
    expect(a.sent).toEqual([]);
    await start(one, two);
    await start(two, one);
    expect(one.game.state.screen).toBe("play");
    expect(two.game.state.round.seed).toBe(one.game.state.round.seed);
    expect(one.game.state.round.hooks).toHaveLength(1);

    const creatures = visitorsOf(one.game.state.round.seed).filter((visitor) => !isFind(visitor.kind));
    const [mine, theirs] = [creatures[0], creatures.find((visitor) => visitor.kind !== creatures[0].kind)];
    const shared = [mine.kind, theirs.kind].sort((first, second) => first - second);
    await land(one, mine);
    await land(two, theirs);
    await playOut(one.game, one.later);
    await both(one, two);
    await playOut(two.game, two.later);
    await both(one, two);
    await both(one, two);

    expect(one.game.state.screen).toBe("end");
    expect(one.game.state.outcome.score).toBe(1);
    const index = one.game.state.outcome.duelIndex;
    expect(one.game.duel.results(index).theirs.score).toBe(1);
    expect(one.game.state.album).toEqual(shared);
    expect(two.game.state.album).toEqual(shared);
  });

  it("offers the friend's seat on the home screen to call them again", async () => {
    const { a } = phones();
    const { game } = await makeGame({ core: a, opening: { live: true } });
    expect(targetOf(game, "rival")).toBeTruthy();
    await tap(game, targetOf(game, "variant", "album"));
    expect(game.state.screen).toBe("album");
  });
});
