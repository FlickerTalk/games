import { describe, expect, it } from "vitest";
import { checkGifts } from "../../src/progress/gifts.js";
import { PROGRESS_KEY, RECORD_VERSION, freshRecord, loadRecord, readRecord, saveRecord } from "../../src/progress/record.js";

const VEHICLES = ["car", "motorbike", "kart", "truck", "bus", "tractor", "police", "fire", "taxi", "rocket", "ufo"];
const withGifts = { gifts: checkGifts({ looks: VEHICLES, free: 5 }) };
const withoutGifts = { gifts: null };

function memoryStore(values = {}) {
  const kept = new Map(Object.entries(values));
  const writes = [];
  return {
    kept,
    writes,
    get: async (key) => (kept.has(key) ? kept.get(key) : null),
    set: async (key, value) => {
      writes.push([key, value]);
      kept.set(key, value);
      return true;
    },
    forget: async (key) => kept.delete(key),
  };
}

describe("the stored progress of a game", () => {
  it("starts on level one, with no losses, no wins, no best mark, and the first look chosen", () => {
    expect(RECORD_VERSION).toBe(1);
    expect(freshRecord(withGifts)).toEqual({ v: 1, level: 1, losses: 0, wins: 0, best: null, received: [], chosen: "car" });
  });

  it("keeps no looks for a game without gifts", () => {
    expect(freshRecord(withoutGifts)).toEqual({ v: 1, level: 1, losses: 0, wins: 0, best: null, received: [], chosen: null });
    expect(readRecord(withoutGifts, { v: 1, level: 3, received: ["ufo"], chosen: "ufo" })).toMatchObject({ level: 3, received: [], chosen: null });
  });

  it("is kept under its own key, one per game, never the key the player's shared choices use, and comes back as it went", async () => {
    expect(PROGRESS_KEY).toBe("progress");
    const store = memoryStore();
    const record = { v: 1, level: 7, losses: 2, wins: 9, best: 31.5, received: ["tractor", "police"], chosen: "police" };
    expect(await saveRecord(store, record)).toBe(true);
    expect(store.writes.map(([key]) => key)).toEqual(["progress"]);
    expect(await loadRecord(withGifts, store)).toEqual(record);
  });

  it("becomes a fresh record from anything unknown or damaged, and reading it never throws", () => {
    const fresh = freshRecord(withGifts);
    const damaged = [
      undefined, null, "", "{not json", "null", "[]", "42", '"text"', "[".repeat(100_000), 7, true, [], () => {},
      { v: 2, level: 9 }, { v: "1", level: 9 }, { level: 9 }, '{"v":2,"level":9}', '{"__proto__":{"v":1,"level":9}}',
    ];
    for (const raw of damaged) expect(readRecord(withGifts, raw), String(raw).slice(0, 40)).toEqual(fresh);
  });

  it("keeps what is right in a damaged record, in the declared order, and resets the rest", () => {
    const raw = { v: 1, level: 7.9, losses: 9, wins: -2, best: "12", received: ["ufo", "car", "nope", "ufo", 3, null, "tractor"], chosen: "rocket" };
    expect(readRecord(withGifts, raw)).toEqual({ v: 1, level: 7, losses: 0, wins: 0, best: null, received: ["tractor", "ufo"], chosen: "car" });
    expect(readRecord(withGifts, { v: 1, level: Infinity, losses: 1.5, wins: 3.2, best: -4, received: "ufo", chosen: "bus" })).toEqual({
      v: 1, level: 1, losses: 1, wins: 3, best: -4, received: [], chosen: "bus",
    });
    expect(readRecord(withGifts, JSON.stringify({ v: 1, level: 4, received: ["ufo"], chosen: "ufo" }))).toMatchObject({ level: 4, chosen: "ufo" });
  });

  it("gives a playable record from a broken or missing store, and says when a write fails", async () => {
    const fresh = freshRecord(withGifts);
    const broken = [
      undefined,
      {},
      { get: () => Promise.reject(new Error("gone")) },
      { get: () => { throw new Error("gone"); } },
      { get: async () => 42 },
      { get: async () => ({ v: 1, level: 5 }) },
      memoryStore({ progress: "{not json" }),
    ];
    for (const store of broken) expect(await loadRecord(withGifts, store)).toEqual(fresh);
    for (const store of [undefined, {}, { set: async () => false }, { set: () => Promise.reject(new Error("full")) }, { set: () => { throw new Error("full"); } }]) {
      expect(await saveRecord(store, fresh)).toBe(false);
    }
  });
});
