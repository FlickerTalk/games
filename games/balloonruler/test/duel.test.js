import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeCore, phones, settle } from "../../../kit/test/helpers.js";
import { Duel, DUEL_RULES } from "../src/duel.js";
import { numbersOf, quantise } from "../src/numbers.js";
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

const both = (...duels) => settle(duels.map((duel) => duel.table));
const perfect = (seed, stage, count) => numbersOf(seed, stage).slice(0, count).map((one) => quantise(one.share));

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("two phones on the same ruler", () => {
  it("say nothing when the game opens", async () => {
    const core = fakeCore();
    const duel = await open(core);
    expect(core.sent).toEqual([]);
    expect(duel.status).toMatchObject({ phase: "none", here: false });
  });

  it("get the same numbers when the player starts, each on a ruler of their own, and learn the other's score and guesses once both are done", async () => {
    const { a, b } = phones();
    const one = await open(a);
    const two = await open(b);
    const mine = await one.start();
    await both(one, two);
    const theirs = await two.start();
    expect(theirs).toEqual(mine);
    await one.finish(0, encodeReport(mine.seed, 1, perfect(mine.seed, 1, 5)));
    await both(one, two);
    await two.finish(0, encodeReport(mine.seed, 6, perfect(mine.seed, 6, 2)));
    await both(one, two);
    await both(one, two);
    expect(one.results(0).mine.score).toBeGreaterThan(one.results(0).theirs.score);
    expect(one.results(0).theirs).toMatchObject({ stage: 6, guesses: perfect(mine.seed, 6, 2) });
    expect(two.results(0).theirs.stage).toBe(1);
    expect(two.results(0).winner).toBe("them");
  });

  it("refuse a report from other numbers or one that cannot be read", () => {
    const start = DUEL_RULES.initial();
    const good = DUEL_RULES.play(start, encodeReport("Ruler001", 1, [0.5]), 0);
    expect(good.state.seed).toBe("Ruler001");
    expect(DUEL_RULES.play(good.state, encodeReport("Ruler002", 1, [0.5]), 1).error).toBe("seed");
    expect(DUEL_RULES.play(start, "nothing", 0).error).toBe("bad");
  });
});
