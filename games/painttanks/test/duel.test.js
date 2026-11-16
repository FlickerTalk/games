import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeCore, phones, settle } from "../../../kit/test/helpers.js";
import { Duel } from "../src/duel.js";
import { setupMove } from "../src/rules.js";

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

async function joined() {
  const { a, b } = phones();
  const one = await open(a);
  const two = await open(b);
  await one.start();
  await both(one, two);
  await two.start();
  await both(one, two);
  await both(one, two);
  return { a, b, one, two };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("two phones in one battle", () => {
  it("say nothing when the game opens", async () => {
    const core = fakeCore();
    const duel = await open(core);
    expect(core.sent).toEqual([]);
    expect(duel.status).toMatchObject({ phase: "none", here: false });
    expect(duel.round).toBeNull();
  });

  it("invite the other phone when the player starts, toss for who starts, and sit on opposite sides", async () => {
    const { a, one, two } = await joined();
    expect(a.sent.length).toBeGreaterThan(0);
    expect(two.status.here).toBe(true);
    expect([one.round.mySide, two.round.mySide].sort()).toEqual([0, 1]);
    expect(one.round.needsSetup).toBe(true);
  });

  it("play the starter's battlefield and each shot on both phones alike", async () => {
    const { one, two } = await joined();
    const [first, second] = one.round.mySide === 0 ? [one, two] : [two, one];
    expect(first.round.myTurn).toBe(true);
    expect(second.round.myTurn).toBe(false);
    await first.play(setupMove({ field: "coast", wind: 3, seed: "AbCdEfGh" }));
    await both(one, two);
    expect(second.round.states.at(-1).setup.field).toBe("coast");
    await first.play("f4560");
    await both(one, two);
    await second.play("f5070");
    await both(one, two);
    expect(JSON.stringify(one.round.states.at(-1))).toBe(JSON.stringify(two.round.states.at(-1)));
    expect(one.round.states).toHaveLength(3);
    expect(first.round.myTurn).toBe(true);
  });

  it("refuse a shot out of turn", async () => {
    const { one, two } = await joined();
    const second = one.round.mySide === 0 ? two : one;
    await second.play("f4560");
    expect(second.round.states).toHaveLength(0);
  });
});
