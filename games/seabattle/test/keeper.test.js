import { describe, expect, it, vi } from "vitest";
import { Fleet, storeKey } from "../src/keeper.js";
import { DEFAULT_FLEET, commitText, fleetText, initial, parseFleet, play, revealText, turn, validFleet } from "../src/rules.js";
import { fromBase64url } from "../src/sha256.js";

const SALT = new Uint8Array(24).fill(0x5a);
const OTHER = DEFAULT_FLEET.map((ship) => ({ ...ship, start: ship.start + 10 }));

function keeping(kept = new Map()) {
  return {
    kept,
    get: vi.fn(async (key) => kept.get(key) ?? null),
    set: vi.fn(async (key, value) => (kept.set(key, value), true)),
  };
}

describe("the fleet kept on this phone", () => {
  it("starts from the usual fleet, unsealed, until what this phone kept is read back", async () => {
    const fleet = new Fleet(keeping());
    expect(fleet.ships).toEqual(DEFAULT_FLEET);
    expect([fleet.salt, fleet.loaded]).toEqual([null, false]);
    await fleet.recall(storeKey("me-1"));
    expect(fleet.loaded).toBe(true);
    expect(fleet.ships).toEqual(DEFAULT_FLEET);
  });

  it("reads back the fleet and the salt it kept for this match, and ignores anything else", async () => {
    const store = keeping(new Map([[storeKey("me-1"), JSON.stringify({ salt: "WlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpa", fleet: fleetText(OTHER) })]]));
    const fleet = new Fleet(store);
    await fleet.recall(storeKey("me-1"));
    expect(fleet.ships).toEqual(OTHER);
    expect(fleet.salt).toEqual(SALT);
    for (const junk of ["{", JSON.stringify({ salt: "short", fleet: fleetText(OTHER) }), JSON.stringify({ salt: "WlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpa", fleet: "nonsense" })]) {
      const other = new Fleet(keeping(new Map([["k", junk]])));
      await other.recall("k");
      expect([other.ships, other.salt, other.loaded]).toEqual([DEFAULT_FLEET, null, true]);
    }
    const bare = new Fleet(undefined);
    await bare.recall("k");
    expect(bare.loaded).toBe(true);
  });

  it("shuffles into another valid fleet", () => {
    const fleet = new Fleet(keeping());
    let seed = 7;
    fleet.shuffle(() => ((seed = (seed * 16807) % 2147483647) / 2147483647));
    expect(validFleet(fleet.ships)).toBe(true);
    expect(fleet.ships).not.toEqual(DEFAULT_FLEET);
  });

  it("seals the fleet with a salt, keeps both before committing, and commits to exactly what it kept", async () => {
    const store = keeping();
    const fleet = new Fleet(store);
    fleet.ships = [...OTHER].reverse();
    const move = await fleet.ready(storeKey("me-1"), SALT);
    expect(move).toMatch(/^c[A-Za-z0-9_-]{43}$/);
    const kept = JSON.parse(store.kept.get(storeKey("me-1")));
    expect(commitText(fromBase64url(kept.salt), parseFleet(kept.fleet))).toBe(move);
    expect(fleet.reveal()).toBe(revealText(SALT, OTHER));
  });

  it("commits nothing when the store refuses to keep the fleet", async () => {
    const store = keeping();
    store.set = vi.fn(async () => false);
    expect(await new Fleet(store).ready("k", SALT)).toBeNull();
    store.set = vi.fn(async () => {
      throw new Error("full");
    });
    expect(await new Fleet(store).ready("k", SALT)).toBeNull();
  });

  it("answers the other side's last shot honestly", () => {
    const fleet = new Fleet(keeping());
    let state = initial();
    for (const move of [commitText(SALT, DEFAULT_FLEET), commitText(SALT, DEFAULT_FLEET), ">11"]) state = play(state, move, turn(state)).state;
    expect(fleet.answer(state, 1)).toBe("h");
  });
});
