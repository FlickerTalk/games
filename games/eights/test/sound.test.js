import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EFFECTS } from "../../../kit/src/sound/index.js";
import { TIMING } from "../../../kit/src/table.js";
import { fakeCore, settle, within } from "../../../kit/test/helpers.js";
import { game } from "../src/index.js";
import { EIGHTS_CUES, EIGHTS_EFFECTS, musicOffAtFirst } from "../src/sound.js";

const tick = () => settle([...document.querySelectorAll("ft-eights")].map((element) => element.table));
const names = (spy) => spy.mock.calls.map(([name]) => name);

function store(kept) {
  const said = new Map(Object.entries(kept));
  return { get: vi.fn(async (key) => said.get(key) ?? null), set: vi.fn(async () => true), forget: vi.fn(async () => true) };
}

async function solo() {
  const core = fakeCore();
  const element = document.createElement("ft-eights");
  element.ft = core.ft;
  document.body.append(element);
  await core.open({ live: false, solo: true });
  await tick();
  element.table.random = () => new Uint8Array(32).fill(1);
  return { element, core };
}

async function touch(element, target) {
  within(element, target).click();
  await tick();
}

beforeEach(() => {
  vi.useFakeTimers({ toNotFake: ["Date"] });
  document.body.innerHTML = "";
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("the sound of crazy eights", () => {
  it("is quiet and dry: short sounds, soft, and nothing that celebrates", () => {
    expect(Object.keys(EIGHTS_EFFECTS).sort()).toEqual(["eights-card", "eights-deal", "eights-draw", "eights-end", "eights-pick"]);
    for (const [name, effect] of Object.entries(EIGHTS_EFFECTS)) {
      expect(effect.duck ?? 0, name).toBe(0);
      for (const voice of effect.voices) {
        expect(voice.start + voice.duration, name).toBeLessThanOrEqual(0.6);
        expect(voice.gain, name).toBeLessThanOrEqual(0.1);
      }
    }
    expect(EIGHTS_CUES).toEqual({ mine: null, theirs: null, won: "eights-end", lost: "eights-end", draw: "eights-end" });
    for (const name of Object.keys(EIGHTS_EFFECTS)) expect(EFFECTS[name], name).toBeUndefined();
  });

  it("keeps the music off until the player turns it on, and remembers it once they do", async () => {
    expect(JSON.parse(await musicOffAtFirst({ store: store({}) }).store.get("sound"))).toEqual({ volume: 1, music: false });
    expect(await musicOffAtFirst({ store: store({ sound: '{"volume":0.4,"music":true}' }) }).store.get("sound")).toBe('{"volume":0.4,"music":true}');
    expect(await musicOffAtFirst({ store: store({}) }).store.get("player")).toBeNull();
    expect(JSON.parse(await musicOffAtFirst(undefined).store.get("sound")).music).toBe(false);
    const kept = store({});
    await musicOffAtFirst({ store: kept }).store.set("sound", "x");
    expect(kept.set).toHaveBeenCalledWith("sound", "x");
  });

  it("starts with the music off on a phone that never chose", async () => {
    expect((await game.sound.ready).music).toBe(false);
  });

  it("asks for the calm tune during a match, with the speaker in the bar beside the way back", async () => {
    const music = vi.spyOn(game.sound, "music");
    const { element } = await solo();
    await touch(element, '[data-kit="new"]');
    expect(music).toHaveBeenLastCalledWith("calm");
    const group = element.querySelector('[data-part="bar"] > .ftg-sound-buttons');
    expect(group.previousElementSibling.querySelector('[data-kit="back"]')).not.toBeNull();
  });

  it("riffles as the cards are dealt and lays each card down with a soft sound, never on the live channel", async () => {
    const played = vi.spyOn(game.sound, "play");
    const { element, core } = await solo();
    await touch(element, '[data-kit="new"]');
    for (let step = 0; step < 6 && element.table.view.state.phase === "shuffle"; step += 1) {
      await vi.advanceTimersByTimeAsync(TIMING.think);
      await tick();
    }
    await vi.advanceTimersByTimeAsync(2000);
    await tick();
    expect(names(played)).toContain("eights-deal");
    expect(core.ft.live.send).not.toHaveBeenCalled();
  });

  it("is in Crazy Eights' package", () => {
    expect(readFileSync(join(import.meta.dirname, "..", "dist", "index.js"), "utf8")).toContain("ftg-sound-buttons");
  });
});
