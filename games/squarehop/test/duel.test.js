import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeCore, phones, settle } from "../../../kit/test/helpers.js";
import { Duel } from "../src/duel.js";
import { diceFor } from "../src/rules.js";

function memoryStore() {
  const kept = new Map();
  return { kept, get: async (key) => kept.get(key) ?? null, set: async (key, value) => (kept.set(key, value), true), forget: async (key) => kept.delete(key) };
}

async function open(core, store = memoryStore()) {
  const duel = new Duel({ ft: { ...core.ft, store }, opening: { live: true, chat: core.chat, lang: "en" }, app: "1.0.0" });
  await duel.ready();
  return duel;
}

const both = (...sides) => settle(sides.map((side) => side.table));

async function racing() {
  const { a, b } = phones();
  const [one, two] = [await open(a), await open(b)];
  await one.start();
  await both(one, two);
  await two.start();
  await both(one, two);
  await both(one, two);
  return { one, two, a, b };
}

async function playRound(one, two) {
  for (let turns = 0; turns < 200 && one.duty() !== "over"; turns += 1) {
    const mover = one.duty() === "pick" ? one : two;
    expect(mover.duty()).toBe("pick");
    await mover.pick(turns % 2);
    await both(one, two);
  }
}

describe("two phones racing by turns", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("say nothing when the game opens, and have nothing to do until the player starts", async () => {
    const core = fakeCore();
    const duel = await open(core);
    expect(core.sent).toEqual([]);
    expect(duel.duty()).toBe("start");
    expect(duel.round).toBeNull();
    expect(duel.status).toMatchObject({ here: false, away: false, invited: false });
  });

  it("do not open a round for a player who has not pressed play, and tell them the other is waiting", async () => {
    const { a, b } = phones();
    const [one, two] = [await open(a), await open(b)];
    await one.start();
    await both(one, two);
    await both(one, two);
    expect(two.duty()).toBe("open");
    expect(two.status.invited).toBe(true);
    expect(one.status.invited).toBe(false);
    expect(one.round.key).toBeNull();
    expect(two.round.key).toBeNull();
  });

  it("open the round with a seed neither chose alone, and give both the same dice", async () => {
    const { one, two } = await racing();
    const [mine, theirs] = [one.round, two.round];
    expect(mine.key).toHaveLength(48);
    expect([...mine.key]).toEqual([...theirs.key]);
    expect(mine.me).toBe(1 - theirs.me);
    expect(mine.picks).toEqual([]);
    expect([one.duty(), two.duty()].sort()).toEqual(["pick", "wait"]);
    const state = one.seen.state;
    expect(state.dice).toEqual(diceFor(mine.key, 0));
  });

  it("never put the secret seed on the wire before the other side's seed is in", async () => {
    const { a, b } = phones();
    const [one, two] = [await open(a, memoryStore()), await open(b)];
    await one.start();
    await both(one, two);
    await both(one, two);
    const committer = one.seen.mySide === 0 ? one : two;
    const core = committer === one ? a : b;
    if (committer === two) {
      await two.start();
      await both(one, two);
    }
    const secret = JSON.parse(await committer.store.get(committer.key)).seed;
    const sent = core.sent.map((data) => atob(data)).join("\n");
    expect(committer.seen.state.commit).not.toBeNull();
    expect(sent).not.toContain(secret);
  });

  it("carry each pick as one move and reach the same finish on both phones", async () => {
    const { one, two } = await racing();
    await playRound(one, two);
    expect(one.duty()).toBe("over");
    expect(two.duty()).toBe("over");
    expect(one.round.picks).toEqual(two.round.picks);
    expect(one.round.picks.length).toBeGreaterThan(4);
    expect(one.seen.state.race).toEqual(two.seen.state.race);
    expect(one.seen.state.race.winner).not.toBeNull();
  });

  it("refuse a pick out of turn without sending anything", async () => {
    const { one, two, a, b } = await racing();
    const waiter = one.duty() === "wait" ? one : two;
    const before = a.sent.length + b.sent.length;
    await waiter.pick(0);
    await both(one, two);
    expect(waiter.round.picks).toEqual([]);
    expect(a.sent.length + b.sent.length).toBe(before);
  });

  it("start the next round when a player plays again, the other side starting it", async () => {
    const { one, two } = await racing();
    const first = one.round.me;
    await playRound(one, two);
    await one.start();
    await both(one, two);
    await two.start();
    await both(one, two);
    await both(one, two);
    expect(one.round.index).toBe(1);
    expect(one.round.me).toBe(1 - first);
    expect(one.round.picks).toEqual([]);
    expect(one.round.key).toHaveLength(48);
    expect([one.duty(), two.duty()].sort()).toEqual(["pick", "wait"]);
  });

  it("give the round up when the phone that committed has lost its seed", async () => {
    const { a, b } = phones();
    const stores = [memoryStore(), memoryStore()];
    const [one, two] = [await open(a, stores[0]), await open(b, stores[1])];
    await one.start();
    await both(one, two);
    await both(one, two);
    const committer = one.seen.mySide === 0 ? one : two;
    const other = committer === one ? two : one;
    if (committer === two) {
      await two.start();
      await both(one, two);
    }
    await committer.store.forget(committer.key);
    await other.start();
    await both(one, two);
    await both(one, two);
    expect(one.duty()).toBe("over");
    expect(one.round.void).toBe(true);
    expect(two.round.void).toBe(true);
  });

  it("go quiet when the player leaves", async () => {
    const { one, two } = await racing();
    await one.leave();
    await both(one, two);
    expect(one.active).toBe(false);
    expect(one.table.record).toBeNull();
    expect(one.round).not.toBeNull();
  });
});
