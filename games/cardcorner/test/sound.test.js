import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EFFECTS } from "../../../kit/src/sound/index.js";
import { fakeCore, settle, within } from "../../../kit/test/helpers.js";
import { game } from "../src/index.js";
import { CARD_CUES, CARD_EFFECTS, musicOffAtFirst } from "../src/sound.js";

const tick = () => settle([...document.querySelectorAll("ft-cardcorner")].map((element) => element.table));

function store(kept) {
  const said = new Map(Object.entries(kept));
  return { get: vi.fn(async (key) => said.get(key) ?? null), set: vi.fn(async () => true), forget: vi.fn(async () => true) };
}

beforeEach(() => {
  vi.useFakeTimers({ toNotFake: ["Date"] });
  document.body.innerHTML = "";
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("the sound of Card Corner", () => {
  it("is quiet and dry: short sounds, soft, and nothing that celebrates", () => {
    expect(Object.keys(CARD_EFFECTS).sort()).toEqual(["cards-card", "cards-deal", "cards-draw", "cards-end", "cards-pick"]);
    for (const [name, effect] of Object.entries(CARD_EFFECTS)) {
      expect(effect.duck ?? 0, name).toBe(0);
      for (const voice of effect.voices) {
        expect(voice.start + voice.duration, name).toBeLessThanOrEqual(0.6);
        expect(voice.gain, name).toBeLessThanOrEqual(0.1);
      }
    }
    expect(CARD_CUES).toEqual({ mine: null, theirs: null, won: "cards-end", lost: "cards-end", draw: "cards-end" });
    for (const name of Object.keys(CARD_EFFECTS)) expect(EFFECTS[name], name).toBeUndefined();
  });

  it("keeps the music off until the player turns it on, and remembers it once they do", async () => {
    expect(JSON.parse(await musicOffAtFirst({ store: store({}) }).store.get("sound"))).toEqual({ volume: 1, music: false });
    expect(await musicOffAtFirst({ store: store({ sound: '{"volume":0.4,"music":true}' }) }).store.get("sound")).toBe('{"volume":0.4,"music":true}');
    expect(await musicOffAtFirst({ store: store({}) }).store.get("player")).toBeNull();
    expect(JSON.parse(await musicOffAtFirst(undefined).store.get("sound")).music).toBe(false);
    const kept = store({});
    await musicOffAtFirst({ store: kept }).store.set("sound", "x");
    expect(kept.set).toHaveBeenCalledWith("sound", "x");
    expect((await game.sound.ready).music).toBe(false);
  });

  it("asks for the calm tune during a match, with the speaker in the bar beside the way back", async () => {
    const music = vi.spyOn(game.sound, "music");
    const core = fakeCore();
    const element = document.createElement("ft-cardcorner");
    element.ft = core.ft;
    document.body.append(element);
    await core.open({ live: false, solo: true });
    await tick();
    within(element, '[data-kit="new"]').click();
    await tick();
    expect(music).toHaveBeenLastCalledWith("calm");
    const group = element.querySelector('[data-part="bar"] > .ftg-sound-buttons');
    expect(group.previousElementSibling.querySelector('[data-kit="back"]')).not.toBeNull();
  });

  it("is in Card Corner's package", () => {
    expect(readFileSync(join(import.meta.dirname, "..", "dist", "index.js"), "utf8")).toContain("ftg-sound-buttons");
  });
});
