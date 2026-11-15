import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, SOUND_KEY, gainOf, loadSettings, normalize, saveSettings } from "../../src/sound/settings.js";

function memoryStore(kept = {}) {
  const values = new Map(Object.entries(kept));
  const writes = [];
  return {
    writes,
    get: async (key) => values.get(key) ?? null,
    set: async (key, value) => {
      writes.push([key, value]);
      values.set(key, value);
      return true;
    },
  };
}

describe("the sound settings", () => {
  it("are one volume from 0 to 1 and one music switch, full and on by default, kept under one key every game shares", () => {
    expect(DEFAULT_SETTINGS).toEqual({ volume: 1, music: true });
    expect(SOUND_KEY).toBe("sound");
  });

  it("take each setting on its own, and anything strange is the default", () => {
    expect(normalize({ volume: 0.4, music: false })).toEqual({ volume: 0.4, music: false });
    expect(normalize({ volume: 0, music: true, other: 1 })).toEqual({ volume: 0, music: true });
    expect(normalize({ volume: 7, music: false })).toEqual({ volume: 1, music: false });
    expect(normalize({ volume: 0.2, music: "yes" })).toEqual({ volume: 0.2, music: true });
    for (const strange of [null, undefined, 3, "x", [], { volume: "0.5" }, { volume: Number.NaN }, { volume: -0.1 }]) {
      expect(normalize(strange), JSON.stringify(strange)).toEqual(DEFAULT_SETTINGS);
    }
  });
});

describe("the volume line", () => {
  it("runs from silence to the balanced mix, following the ear: half way is clearly quieter than half", () => {
    expect(gainOf(0)).toBe(0);
    expect(gainOf(1)).toBe(1);
    expect(gainOf(0.5)).toBeGreaterThanOrEqual(0.15);
    expect(gainOf(0.5)).toBeLessThanOrEqual(0.35);
  });

  it("never jumps, and holds a position off the line at its ends", () => {
    for (let step = 1; step <= 100; step += 1) {
      expect(gainOf(step / 100)).toBeGreaterThan(gainOf((step - 1) / 100));
      expect(gainOf(step / 100) - gainOf((step - 1) / 100)).toBeLessThanOrEqual(0.03);
    }
    expect(gainOf(-0.2)).toBe(0);
    expect(gainOf(2.5)).toBe(1);
    expect(gainOf(Number.NaN)).toBe(0);
  });
});

describe("keeping the settings", () => {
  it("brings back what was kept, and the defaults when nothing was", async () => {
    expect(await loadSettings(memoryStore({ [SOUND_KEY]: '{"volume":0.4,"music":false}' }))).toEqual({ volume: 0.4, music: false });
    expect(await loadSettings(memoryStore())).toEqual(DEFAULT_SETTINGS);
    expect(await loadSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });

  it("falls back to the defaults when the store is broken, failing or silent", async () => {
    expect(await loadSettings(memoryStore({ [SOUND_KEY]: "not json" }))).toEqual(DEFAULT_SETTINGS);
    expect(await loadSettings(memoryStore({ [SOUND_KEY]: '{"volume":7,"music":false}' }))).toEqual({ volume: 1, music: false });
    expect(await loadSettings({ get: async () => { throw new Error("gone"); } })).toEqual(DEFAULT_SETTINGS);
    expect(await loadSettings({ get: () => { throw new Error("gone"); } })).toEqual(DEFAULT_SETTINGS);
    expect(await loadSettings({ get: () => new Promise(() => {}) }, { waitMs: 5 })).toEqual(DEFAULT_SETTINGS);
  });

  it("writes the two settings as one small value, and says whether the store took it", async () => {
    const store = memoryStore();
    expect(await saveSettings(store, { volume: 0.4, music: false, other: 1 })).toBe(true);
    expect(store.writes).toEqual([[SOUND_KEY, '{"volume":0.4,"music":false}']]);
    expect(await saveSettings(undefined, DEFAULT_SETTINGS)).toBe(false);
    expect(await saveSettings({ set: async () => { throw new Error("full"); } }, DEFAULT_SETTINGS)).toBe(false);
    expect(await saveSettings({ set: async () => false }, DEFAULT_SETTINGS)).toBe(false);
  });
});
