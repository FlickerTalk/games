import { describe, expect, it, vi } from "vitest";
import { cleaned, keeper, storeKey } from "../src/secret.js";

const SALT = new Uint8Array(24).fill(0x5a);

function store(entries = {}) {
  const kept = new Map(Object.entries(entries));
  return { kept, ft: { store: { get: vi.fn(async (key) => kept.get(key) ?? null), set: vi.fn(async (key, value) => (kept.set(key, value), true)) } } };
}

describe("the secret word on this phone", () => {
  it("cleans what is typed: lower case, accents off, ñ kept, letters only", () => {
    expect(cleaned("SEÑOR")).toBe("señor");
    expect(cleaned("árbol")).toBe("arbol");
    expect(cleaned("c r-a1ne")).toBe("crane");
    expect(cleaned("abcdefgh")).toBe("abcde");
    expect(cleaned(null)).toBe("");
  });

  it("is kept under the player and the round, and comes back with its salt", async () => {
    const { ft, kept } = store();
    const keep = keeper(ft);
    expect(storeKey("me-1", 3)).toBe("wordduel/me-1/3");
    expect(await keep.keep(storeKey("me-1", 3), SALT, "crane")).toBe(true);
    expect(JSON.parse(kept.get("wordduel/me-1/3"))).toEqual({ salt: "WlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpa", word: "crane" });
    expect(await keep.recall(storeKey("me-1", 3), "en")).toEqual({ salt: SALT, word: "crane" });
  });

  it("comes back as nothing when it was never kept, is broken, or is not a word of the list", async () => {
    const { ft } = store({ broken: "{", short: JSON.stringify({ salt: "AAAA", word: "crane" }), foreign: JSON.stringify({ salt: "WlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpa", word: "zzzzz" }) });
    const keep = keeper(ft);
    for (const key of ["missing", "broken", "short", "foreign"]) expect(await keep.recall(key, "en"), key).toBeNull();
    expect(await keeper(undefined).recall("any", "en")).toBeNull();
  });

  it("tells when the store would not keep it, so nothing is committed that could not be revealed", async () => {
    expect(await keeper({ store: { set: async () => false } }).keep("k", SALT, "crane")).toBe(false);
    expect(await keeper({ store: { set: async () => Promise.reject(new Error("full")) } }).keep("k", SALT, "crane")).toBe(false);
    expect(await keeper(undefined).keep("k", SALT, "crane")).toBe(true);
  });
});
