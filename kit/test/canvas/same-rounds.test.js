import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isSeed } from "../../src/canvas/random.js";
import { SameRounds, sameRoundRules } from "../../src/canvas/same-rounds.js";
import { TIMING } from "../../src/table.js";
import { fakeCore, phones, playOut, settle } from "../helpers.js";

const move = (seed, score) => `${seed}${score}`;

function read(text) {
  if (typeof text !== "string" || !isSeed(text.slice(0, 8))) return null;
  const rest = text.slice(8);
  if (!rest) return { error: "unfinished" };
  if (!/^\d{1,4}$/.test(rest)) return null;
  return { seed: text.slice(0, 8), score: Number(rest), done: true };
}

const RULES = sameRoundRules({ id: "toy", gv: 1, read });

function memoryStore() {
  const kept = new Map();
  return { kept, get: async (key) => kept.get(key) ?? null, set: async (key, value) => (kept.set(key, value), true), forget: async (key) => kept.delete(key) };
}

async function open(core) {
  const rounds = new SameRounds({ ft: { ...core.ft, store: memoryStore() }, opening: { live: true, chat: core.chat, lang: "en" }, app: "1.0.0", rules: RULES });
  await rounds.ready();
  return rounds;
}

const both = (...sides) => settle(sides.map((side) => side.table));

describe("the rules of a round both phones play alike", () => {
  it("wait for the starter's round, then the other's, and compare their scores", () => {
    let state = RULES.initial();
    expect(RULES.turn(state)).toBe(0);
    state = RULES.play(state, move("SameSeed", 40), 0).state;
    expect(state.results[0]).toEqual({ score: 40, done: true });
    expect(RULES.result(state)).toBeNull();
    state = RULES.play(state, move("SameSeed", 55), 1).state;
    expect(RULES.result(state)).toEqual({ winner: 1 });
    expect(RULES.result(RULES.play(RULES.play(RULES.initial(), move("SameSeed", 9), 0).state, move("SameSeed", 9), 1).state)).toEqual({ winner: null });
  });

  it("refuse a round out of turn, from another seed, unfinished, malformed, or after the end, and never change the state given", () => {
    const started = RULES.play(RULES.initial(), move("SameSeed", 4), 0).state;
    expect(RULES.play(RULES.initial(), move("SameSeed", 4), 1)).toEqual({ error: "turn" });
    expect(RULES.play(started, move("OtherOne", 4), 1)).toEqual({ error: "seed" });
    expect(RULES.play(RULES.initial(), "SameSeed", 0)).toEqual({ error: "unfinished" });
    expect(RULES.play(RULES.initial(), "non sense", 0)).toEqual({ error: "bad" });
    expect(RULES.play(RULES.initial(), 7, 0)).toEqual({ error: "bad" });
    const ended = RULES.play(started, move("SameSeed", 4), 1).state;
    expect(RULES.play(ended, move("SameSeed", 4), 0)).toEqual({ error: "over" });
    const state = RULES.initial();
    RULES.play(state, move("SameSeed", 4), 0);
    expect(state).toEqual(RULES.initial());
  });

  it("play out with the kit's helper", () => {
    const { moves, result } = playOut(RULES, [() => move("Helper01", 3), () => move("Helper01", 5)]);
    expect(moves).toHaveLength(2);
    expect(result.winner).toBe(1);
  });
});

describe("two phones on the same rounds", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("say nothing when the game opens", async () => {
    const core = fakeCore();
    const rounds = await open(core);
    expect(core.sent).toEqual([]);
    expect(rounds.status).toMatchObject({ phase: "none", here: false });
  });

  it("invite the other phone when the player starts, and both play the round of the same seed", async () => {
    const { a, b } = phones();
    const one = await open(a);
    const two = await open(b);
    const mine = await one.start();
    await both(one, two);
    expect(two.status.here).toBe(true);
    expect(await two.start()).toEqual(mine);
    expect(mine.index).toBe(0);
    expect(isSeed(mine.seed)).toBe(true);
  });

  it("compare the two rounds once both have ended, whichever ends first, and let a player go on ahead", async () => {
    const { a, b } = phones();
    const one = await open(a);
    const two = await open(b);
    const { seed } = await one.start();
    await both(one, two);
    await two.start();
    await one.finish(0, move(seed, 30));
    await both(one, two);
    expect(one.results(0)).toMatchObject({ mine: { score: 30 }, theirs: null, winner: null });
    const next = await one.start();
    expect(next.index).toBe(1);
    expect(next.seed).not.toBe(seed);
    await one.finish(1, move(next.seed, 12));
    await two.finish(0, move(seed, 44));
    await both(one, two);
    await both(one, two);
    expect(one.results(0)).toMatchObject({ mine: { score: 30 }, theirs: { score: 44 }, winner: "them" });
    expect(two.results(0)).toMatchObject({ mine: { score: 44 }, theirs: { score: 30 }, winner: "me" });
    expect(await two.start()).toEqual(next);
  });

  it("keep a round played while the friend was away, and compare it once they open the game", async () => {
    const { a, b } = phones();
    b.closed = true;
    const one = await open(a);
    const { seed } = await one.start();
    await one.finish(0, move(seed, 21));
    await both(one);
    b.closed = false;
    const two = await open(b);
    await vi.advanceTimersByTimeAsync(TIMING.ack + TIMING.retry);
    await both(one, two);
    await both(one, two);
    expect((await two.start()).seed).toBe(seed);
    await two.finish(0, move(seed, 8));
    await both(one, two);
    await both(one, two);
    expect(one.results(0).theirs).toMatchObject({ score: 8 });
  });
});
