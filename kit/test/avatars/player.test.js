import { describe, expect, it, vi } from "vitest";
import { HAIRS, HAIR_COLOURS, PROFILES } from "../../src/avatars/cast.js";
import { NAME_LENGTH, PLAYER_KEY, cleanName, defaultPlayer, loadPlayer, normalizePlayer, playerName, savePlayer } from "../../src/avatars/player.js";

function memoryStore(entries = {}) {
  const kept = new Map(Object.entries(entries));
  return {
    kept,
    get: vi.fn(async (key) => kept.get(key) ?? null),
    set: vi.fn(async (key, value) => {
      kept.set(key, value);
      return true;
    }),
  };
}

describe("the player's choice", () => {
  it("starts as the first profile, no hair, black hair and the profile's own name", () => {
    expect(defaultPlayer()).toEqual({ who: "ari", hair: "none", hairColour: "ink", name: "" });
    expect(playerName(defaultPlayer())).toBe("Ari");
    expect(defaultPlayer()).not.toBe(defaultPlayer());
  });

  it("takes any hairstyle and any hair colour on any profile", () => {
    for (const profile of PROFILES) {
      for (const hair of HAIRS) {
        for (const colour of HAIR_COLOURS) {
          const choice = { who: profile.id, hair: hair.id, hairColour: colour.id, name: "Lia" };
          expect(normalizePlayer(choice)).toEqual(choice);
        }
      }
    }
  });

  it("turns an id it does not know into the default, field by field, and keeps nothing else", () => {
    expect(normalizePlayer({ who: "nobody", hair: "quiff", hairColour: "teal", name: "Lia", extra: 1 })).toEqual({ who: "ari", hair: "quiff", hairColour: "ink", name: "Lia" });
    expect(normalizePlayer({ who: "milo", hair: "mohawk", hairColour: "copper" })).toEqual({ who: "milo", hair: "none", hairColour: "copper", name: "" });
    for (const raw of [null, undefined, 7, "milo", [], { who: ["milo"] }, { who: { id: "milo" } }]) {
      expect(normalizePlayer(raw), JSON.stringify(raw)).toEqual(defaultPlayer());
    }
  });

  it("never lets a player be Flick", () => {
    expect(normalizePlayer({ who: "flick", hair: "cap" }).who).toBe("ari");
  });

  it("cleans a name: trimmed, one space between words, no control or direction characters, cut to its length", () => {
    expect(cleanName("  Lia   Rose \n")).toBe("Lia Rose");
    expect(cleanName("Li\u0000a‮⁦x‏")).toBe("Liax");
    expect(cleanName("abcdefghijklmnopqrstuvwxyz")).toBe("abcdefghijkl");
    expect(NAME_LENGTH).toBe(12);
    expect(cleanName("👩‍👩‍👧‍👦".repeat(14))).toBe("👩‍👩‍👧‍👦".repeat(12));
    expect(cleanName("<b>Lia</b>")).toBe("<b>Lia</b>");
    for (const raw of [null, undefined, 3, {}, "   "]) expect(cleanName(raw), String(raw)).toBe("");
  });

  it("shows the player's name, or the profile's own when it has none", () => {
    expect(playerName({ who: "milo", name: "" })).toBe("Milo");
    expect(playerName({ who: "milo", name: " Lia " })).toBe("Lia");
    expect(playerName({ who: "flick" })).toBe("Flick");
    expect(playerName(null)).toBe("Ari");
  });
});

describe("the stored choice", () => {
  it("is kept under one key, the same in every game", () => {
    expect(PLAYER_KEY).toBe("player");
  });

  it("is read back as it was saved", async () => {
    const store = memoryStore();
    expect(await savePlayer(store, { who: "milo", hair: "quiff", hairColour: "copper", name: " Lia " })).toBe(true);
    expect(JSON.parse(store.kept.get("player"))).toEqual({ who: "milo", hair: "quiff", hairColour: "copper", name: "Lia" });
    expect(await loadPlayer(store)).toEqual({ who: "milo", hair: "quiff", hairColour: "copper", name: "Lia" });
  });

  it("leaves alone what another game keeps in the same record", async () => {
    const car = { kind: "car", color: "red", received: ["car", "van"], winsSinceGift: 1, topLevel: 3 };
    const store = memoryStore({ player: JSON.stringify(car) });
    expect(await loadPlayer(store)).toBeNull();
    await savePlayer(store, { who: "sam", hair: "braids", hairColour: "golden", name: "" });
    expect(JSON.parse(store.kept.get("player"))).toEqual({ ...car, who: "sam", hair: "braids", hairColour: "golden", name: "" });
    expect(await loadPlayer(store)).toEqual({ who: "sam", hair: "braids", hairColour: "golden", name: "" });
  });

  it("moves a stored id this version does not know to the default", async () => {
    const store = memoryStore({ player: JSON.stringify({ who: "zed", hair: "afro", hairColour: "blue", name: "Lia" }) });
    expect(await loadPlayer(store)).toEqual({ who: "ari", hair: "none", hairColour: "ink", name: "Lia" });
  });

  it("is nothing when there is no choice yet, the record is broken or the store fails", async () => {
    expect(await loadPlayer(memoryStore())).toBeNull();
    expect(await loadPlayer(memoryStore({ player: "{not json" }))).toBeNull();
    expect(await loadPlayer(memoryStore({ player: "[1,2]" }))).toBeNull();
    expect(await loadPlayer({ get: async () => Promise.reject(new Error("gone")) })).toBeNull();
    expect(await loadPlayer({ get: () => { throw new Error("gone"); } })).toBeNull();
    expect(await loadPlayer(undefined)).toBeNull();
  });

  it("replaces a record that is not an object, and says when the store did not keep it", async () => {
    const store = memoryStore({ player: "[1,2]" });
    expect(await savePlayer(store, { who: "rio" })).toBe(true);
    expect(JSON.parse(store.kept.get("player"))).toEqual({ who: "rio", hair: "none", hairColour: "ink", name: "" });
    expect(await savePlayer({ get: async () => null, set: async () => false }, defaultPlayer())).toBe(false);
    expect(await savePlayer({ get: async () => null, set: async () => Promise.reject(new Error("full")) }, defaultPlayer())).toBe(false);
    expect(await savePlayer(undefined, defaultPlayer())).toBe(false);
  });
});
