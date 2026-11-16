import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TIMING } from "../../../kit/src/table.js";
import { fakeCore, phones, settle } from "../../../kit/test/helpers.js";
import { spots } from "../src/court.js";
import { Duel } from "../src/duel.js";
import { pieceOf } from "../src/pieces.js";
import { encodeReport } from "../src/report.js";
import { placeInRound, startRound } from "../src/round.js";

function memoryStore() {
  const kept = new Map();
  return { kept, get: async (key) => kept.get(key) ?? null, set: async (key, value) => (kept.set(key, value), true), forget: async (key) => kept.delete(key) };
}

function playOut(seed, last = false) {
  let round = startRound({ seed });
  while (!round.over) {
    const slot = round.slots.findIndex((id) => id && spots(round.court, pieceOf(id)).length);
    const found = spots(round.court, pieceOf(round.slots[slot]));
    round = placeInRound(round, slot, last ? found.at(-1) : found[0]).round;
  }
  return round;
}

async function open(core) {
  const duel = new Duel({ ft: { ...core.ft, store: memoryStore() }, opening: { live: true, chat: core.chat, lang: "en" }, app: "1.0.0" });
  await duel.ready();
  return duel;
}

const both = (...duels) => settle(duels.map((duel) => duel.table));

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("two phones on the same trays", () => {
  it("says nothing when the game opens", async () => {
    const core = fakeCore();
    const duel = await open(core);
    expect(core.sent).toEqual([]);
    expect(duel.status).toMatchObject({ phase: "none", here: false });
  });

  it("invites the other phone when the player starts, and both play the same round", async () => {
    const { a, b } = phones();
    const one = await open(a);
    const two = await open(b);
    const mine = await one.start();
    await both(one, two);
    expect(a.sent.length).toBeGreaterThan(0);
    expect(two.status.here).toBe(true);
    const theirs = await two.start();
    expect(theirs).toEqual(mine);
    expect(mine.index).toBe(0);
    expect(mine.seed).toMatch(/^[A-Za-z0-9_-]{8}$/);
  });

  it("compares the two rounds once both have ended, whichever ends first", async () => {
    const { a, b } = phones();
    const one = await open(a);
    const two = await open(b);
    const { seed } = await one.start();
    await both(one, two);
    await two.start();
    const first = playOut(seed);
    const second = playOut(seed, true);
    await one.finish(0, encodeReport(first));
    await both(one, two);
    expect(one.results(0).mine.score).toBe(first.score);
    await two.finish(0, encodeReport(second));
    await both(one, two);
    await both(one, two);
    const winner = first.score === second.score ? "draw" : first.score > second.score ? "me" : "them";
    expect(one.results(0)).toMatchObject({ mine: { score: first.score }, theirs: { score: second.score }, winner });
    expect(two.results(0)).toMatchObject({ mine: { score: second.score }, theirs: { score: first.score } });
  });

  it("lets a player go on to the next round before the other has ended theirs, and sends it when it can", async () => {
    const { a, b } = phones();
    const one = await open(a);
    const two = await open(b);
    const { seed } = await one.start();
    await both(one, two);
    await two.start();
    await one.finish(0, encodeReport(playOut(seed)));
    await both(one, two);
    const next = await one.start();
    expect(next.index).toBe(1);
    expect(next.seed).not.toBe(seed);
    await one.finish(1, encodeReport(playOut(next.seed)));
    await both(one, two);
    expect(one.results(1).theirs).toBeNull();
    await two.finish(0, encodeReport(playOut(seed, true)));
    await both(one, two);
    await both(one, two);
    expect(two.results(0).theirs).not.toBeNull();
    const later = await two.start();
    expect(later).toEqual(next);
    await two.finish(1, encodeReport(playOut(next.seed, true)));
    await both(one, two);
    await both(one, two);
    expect(one.results(1).theirs).not.toBeNull();
    expect(two.results(1).theirs).not.toBeNull();
  });

  it("keeps the round of a player whose friend opens the game later, and compares it then", async () => {
    const { a, b } = phones();
    b.closed = true;
    const one = await open(a);
    const { seed } = await one.start();
    await one.finish(0, encodeReport(playOut(seed)));
    await both(one);
    expect(one.status.phase).toBe("invite");
    b.closed = false;
    const two = await open(b);
    await vi.advanceTimersByTimeAsync(TIMING.ack + TIMING.retry);
    await both(one, two);
    await both(one, two);
    expect(two.status.here).toBe(true);
    const theirs = await two.start();
    expect(theirs.seed).toBe(seed);
    await two.finish(0, encodeReport(playOut(seed, true)));
    await both(one, two);
    await both(one, two);
    expect(one.results(0).theirs).not.toBeNull();
    expect(two.results(0).theirs).not.toBeNull();
  });
});
