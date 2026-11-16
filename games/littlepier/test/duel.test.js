import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeCore, phones, settle } from "../../../kit/test/helpers.js";
import { Duel, DUEL_RULES } from "../src/duel.js";
import { isFind, visitorsOf } from "../src/pond.js";
import { encodeReport } from "../src/report.js";

function memoryStore() {
  const kept = new Map();
  return { kept, get: async (key) => kept.get(key) ?? null, set: async (key, value) => (kept.set(key, value), true), forget: async (key) => kept.delete(key) };
}

async function open(core) {
  const duel = new Duel({ ft: { ...core.ft, store: memoryStore() }, opening: { live: true, chat: core.chat, lang: "en" }, app: "1.0.0" });
  await duel.ready();
  return duel;
}

const fishOf = (seed, count, skip = 0) => visitorsOf(seed).filter((one) => !isFind(one.kind)).slice(skip, skip + count).map((one) => one.id);
const both = (...duels) => settle(duels.map((duel) => duel.table));

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("two phones at the same pier", () => {
  it("say nothing when the game opens", async () => {
    const core = fakeCore();
    const duel = await open(core);
    expect(core.sent).toEqual([]);
    expect(duel.status).toMatchObject({ phase: "none", here: false });
  });

  it("fish the same water when the player starts, and each learns the other's catch and creatures once both are done", async () => {
    const { a, b } = phones();
    const one = await open(a);
    const two = await open(b);
    const mine = await one.start();
    await both(one, two);
    expect(two.status.here).toBe(true);
    const theirs = await two.start();
    expect(theirs).toEqual(mine);
    const first = fishOf(mine.seed, 3);
    const second = fishOf(mine.seed, 2, 3);
    await one.finish(0, encodeReport(mine.seed, first));
    await both(one, two);
    await two.finish(0, encodeReport(mine.seed, second));
    await both(one, two);
    await both(one, two);
    expect(one.results(0).mine.score).toBe(3);
    expect(one.results(0).theirs.score).toBe(2);
    const kinds = new Set(second.map((id) => visitorsOf(mine.seed)[id].kind));
    expect(new Set(one.results(0).theirs.kinds)).toEqual(kinds);
    expect(two.results(0).theirs.score).toBe(3);
  });

  it("refuse a catch from another water or a visitor caught twice", () => {
    const start = DUEL_RULES.initial();
    const seed = "Water001";
    const good = DUEL_RULES.play(start, encodeReport(seed, fishOf(seed, 2)), 0);
    expect(good.state.seed).toBe(seed);
    expect(DUEL_RULES.play(good.state, encodeReport("Water002", fishOf("Water002", 1)), 1).error).toBe("seed");
    expect(DUEL_RULES.play(start, encodeReport(seed, [1, 1]), 0).error).toBe("bad");
  });
});
