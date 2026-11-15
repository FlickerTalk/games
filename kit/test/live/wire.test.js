import { describe, expect, it } from "vitest";
import { KV, PROTOCOL, fromBase64, seal, toBase64, unseal } from "../../src/envelope.js";
import { LIVE_KINDS, TICK_LIMIT, openLive, sealLive } from "../../src/live/wire.js";

const base = { g: "racer", gv: 2, doc: "doc1", who: "me1" };
const check = (s) => (Array.isArray(s) && s.length === 2 && s.every(Number.isFinite) ? [s[0], s[1]] : null);
const open = (data) => openLive(data, { g: "racer", gv: 2, check });
const raw = (message) => toBase64(new TextEncoder().encode(JSON.stringify(message)));
const wire = (fields) => raw({ p: PROTOCOL, kv: KV, g: "racer", gv: 2, doc: "doc1", who: "me1", ...fields });

describe("the real-time messages", () => {
  it("travel in the games' envelope, the kit's version and the game's, small enough for many a second", () => {
    const data = sealLive({ ...base, k: "tick", t: 1234.5, s: [3, 4] });
    const message = JSON.parse(new TextDecoder().decode(fromBase64(data)));
    expect(message).toEqual({ p: PROTOCOL, kv: KV, g: "racer", gv: 2, k: "tick", doc: "doc1", who: "me1", t: 1234.5, s: [3, 4] });
    expect(data.length).toBeLessThan(160);
    expect(LIVE_KINDS).toEqual(["hello", "ready", "go", "tick", "done", "bye"]);
  });

  it("open as exactly what each kind carries, and nothing else", () => {
    expect(open(sealLive({ ...base, k: "hello", ready: true, app: "1.2.0", extra: 1 }))).toEqual({ message: { k: "hello", doc: "doc1", who: "me1", ready: true, re: false, app: "1.2.0" } });
    expect(open(sealLive({ ...base, k: "hello", ready: false, re: true }))).toEqual({ message: { k: "hello", doc: "doc1", who: "me1", ready: false, re: true, app: "" } });
    expect(open(sealLive({ ...base, k: "ready" }))).toEqual({ message: { k: "ready", doc: "doc1", who: "me1" } });
    expect(open(sealLive({ ...base, k: "go", ms: 3000 }))).toEqual({ message: { k: "go", doc: "doc1", who: "me1", ms: 3000 } });
    expect(open(sealLive({ ...base, k: "tick", t: 50, s: [1, 2] }))).toEqual({ message: { k: "tick", doc: "doc1", who: "me1", t: 50, s: [1, 2] } });
    expect(open(sealLive({ ...base, k: "done", t: 41_000 }))).toEqual({ message: { k: "done", doc: "doc1", who: "me1", t: 41_000 } });
    expect(open(sealLive({ ...base, k: "done", t: null }))).toEqual({ message: { k: "done", doc: "doc1", who: "me1", t: null } });
    expect(open(sealLive({ ...base, k: "bye" }))).toEqual({ message: { k: "bye", doc: "doc1", who: "me1" } });
  });

  it("ignore another game, another protocol, an older envelope's kinds and anything malformed", () => {
    for (const data of [
      raw({ p: PROTOCOL, kv: KV, g: "chess", gv: 2, k: "tick", doc: "doc1", who: "me1", t: 1, s: [1, 2] }),
      raw({ p: "other", kv: KV, g: "racer", gv: 2, k: "tick", doc: "doc1", who: "me1", t: 1, s: [1, 2] }),
      wire({ k: "state", game: {} }),
      wire({ k: "tick", t: 1, s: [1, 2], doc: "../x" }),
      wire({ k: "tick", t: 1, s: [1, 2], who: "" }),
      wire({ k: "hello", ready: "yes" }),
      wire({ k: "go", ms: 3000.5 }),
      wire({ k: "go", ms: -1 }),
      wire({ k: "go", ms: 60_000 }),
      wire({ k: "tick", t: -5, s: [1, 2] }),
      wire({ k: "tick", t: Number.MAX_VALUE, s: [1, 2] }),
      wire({ k: "tick", t: "1", s: [1, 2] }),
      wire({ k: "tick", t: 1, s: [1, "x"] }),
      wire({ k: "tick", t: 1 }),
      wire({ k: "done", t: 1e300 }),
      wire({ k: "done", t: "40000" }),
      wire({ k: "done" }),
      raw([1, 2]),
      raw(null),
      "not base64 at all ***",
      toBase64(new TextEncoder().encode("{not json")),
      42,
      null,
    ]) {
      expect(open(data), String(data).slice(0, 60)).toBeNull();
    }
  });

  it("refuse a tick bigger than a tick should be, and anything bigger than the core carries, without reading it", () => {
    expect(open(wire({ k: "tick", t: 1, s: [1, 2], pad: "x".repeat(TICK_LIMIT) }))).toBeNull();
    expect(open("A".repeat(70_000))).toBeNull();
    expect(() => sealLive({ ...base, k: "tick", t: 1, s: ["x".repeat(TICK_LIMIT)] })).toThrow(RangeError);
  });

  it("take whatever the game's check makes of the state, and ignore it when the check throws", () => {
    const throwing = openLive(wire({ k: "tick", t: 1, s: { a: 1 } }), { g: "racer", gv: 2, check: () => { throw new Error("bad"); } });
    expect(throwing).toBeNull();
    const shaped = openLive(wire({ k: "tick", t: 1, s: { a: 1, b: 2 } }), { g: "racer", gv: 2, check: (s) => ({ a: s.a }) });
    expect(shaped.message.s).toEqual({ a: 1 });
  });

  it("say a newer phone is newer, with its version, instead of reading what it sends", () => {
    expect(open(raw({ p: PROTOCOL, kv: KV + 1, g: "racer", gv: 2, k: "hello", doc: "d", who: "w", app: "2.0.0" }))).toEqual({ newer: { app: "2.0.0" } });
    expect(open(raw({ p: PROTOCOL, kv: KV, g: "racer", gv: 3, k: "whatever", app: 7 }))).toEqual({ newer: { app: "" } });
  });

  it("never reach a turn-based game, and a turn-based message never reaches a real-time one", () => {
    expect(unseal(sealLive({ ...base, k: "tick", t: 1, s: [1, 2] }), { g: "racer", gv: 2 })).toBeNull();
    expect(open(seal({ p: PROTOCOL, kv: KV, g: "racer", gv: 2, k: "state", doc: "doc1", who: "me1", game: { moves: [] } }))).toBeNull();
  });
});
