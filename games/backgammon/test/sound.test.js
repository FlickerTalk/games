import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EFFECTS } from "../../../kit/src/sound/index.js";
import { fakeCore, settle, within } from "../../../kit/test/helpers.js";
import { game } from "../src/index.js";
import { legalMoves } from "../src/rules.js";
import { BACKGAMMON_CUES, BACKGAMMON_EFFECTS, musicOffAtFirst } from "../src/sound.js";

const tick = () => settle([...document.querySelectorAll("ft-backgammon")].map((element) => element.table));
const names = (spy) => spy.mock.calls.map(([name]) => name);

async function solo() {
  const core = fakeCore();
  const element = document.createElement("ft-backgammon");
  element.ft = core.ft;
  document.body.append(element);
  await core.open({ live: false, solo: true });
  await tick();
  element.table.random = () => new Uint8Array(32);
  return { element, core };
}

async function touch(element, target) {
  within(element, target).click();
  await tick();
}

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

describe("the sound of backgammon", () => {
  it("is quiet and dry: short sounds, softer than the kit's, and nothing that celebrates", () => {
    expect(Object.keys(BACKGAMMON_EFFECTS).sort()).toEqual(["bg-dice", "bg-end", "bg-hit", "bg-move", "bg-pick"]);
    for (const [name, effect] of Object.entries(BACKGAMMON_EFFECTS)) {
      expect(effect.duck ?? 0, name).toBe(0);
      for (const voice of effect.voices) {
        expect(voice.start + voice.duration, name).toBeLessThanOrEqual(0.5);
        expect(voice.gain, name).toBeLessThanOrEqual(0.1);
      }
    }
    for (const name of Object.keys(BACKGAMMON_EFFECTS)) expect(EFFECTS[name], name).toBeUndefined();
  });

  it("leaves each checker and roll to the table, which sounds them as they land, and closes a round with one quiet sound", () => {
    expect(BACKGAMMON_CUES).toEqual({ mine: null, theirs: null, won: "bg-end", lost: "bg-end", draw: "bg-end" });
  });

  it("keeps the music off until the player turns it on, and remembers it once they do", async () => {
    const fresh = musicOffAtFirst({ store: store({}) });
    expect(JSON.parse(await fresh.store.get("sound"))).toEqual({ volume: 1, music: false });
    const chosen = musicOffAtFirst({ store: store({ sound: '{"volume":0.4,"music":true}', player: "{}" }) });
    expect(await chosen.store.get("sound")).toBe('{"volume":0.4,"music":true}');
    expect(await chosen.store.get("player")).toBe("{}");
    expect(await musicOffAtFirst({ store: store({}) }).store.get("player")).toBeNull();
    expect(JSON.parse(await musicOffAtFirst(undefined).store.get("sound")).music).toBe(false);
    const kept = store({});
    const onClose = vi.fn();
    const ft = musicOffAtFirst({ store: kept, onClose });
    await ft.store.set("sound", "x");
    expect(kept.set).toHaveBeenCalledWith("sound", "x");
    expect(ft.onClose).toBe(onClose);
  });

  it("starts with the music off on a phone that never chose", async () => {
    expect((await game.sound.ready).music).toBe(false);
  });

  it("asks for the calm tune during a match, with the speaker in the bar beside the way back and the music switch on its line", async () => {
    const music = vi.spyOn(game.sound, "music");
    const { element } = await solo();
    await touch(element, '[data-kit="new"]');
    expect(music).toHaveBeenLastCalledWith("calm");
    const group = element.querySelector('[data-part="bar"] > .ftg-sound-buttons');
    expect(group.previousElementSibling.querySelector('[data-kit="back"]')).not.toBeNull();
    expect(element.querySelector('.ftg-volume [data-sound="music"]')).not.toBeNull();
  });

  it("answers the touch of a checker, and never sounds the hidden steps of a roll as moves", async () => {
    const played = vi.spyOn(game.sound, "play");
    const { element, core } = await solo();
    await touch(element, '[data-kit="new"]');
    for (let at = 0; at < 40 && !(element.table.view.myTurn && element.table.view.state.dice); at += 1) {
      await vi.advanceTimersByTimeAsync(200);
      await tick();
    }
    expect(element.table.record.game.moves.length).toBeGreaterThanOrEqual(3);
    expect(names(played)).toEqual([]);
    const from = legalMoves(element.table.view.state)[0].from;
    await touch(element, `button[data-key="${from === "b" ? "bar" : from}"]`);
    expect(names(played)).toEqual(["bg-pick"]);
    expect(core.ft.live.send).not.toHaveBeenCalled();
  });

  it("is in Backgammon's package", () => {
    expect(readFileSync(join(import.meta.dirname, "..", "dist", "index.js"), "utf8")).toContain("ftg-sound-buttons");
  });
});
