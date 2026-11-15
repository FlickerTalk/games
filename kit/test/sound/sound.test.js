import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSound } from "../../src/sound/sound.js";
import { EFFECTS } from "../../src/sound/effects.js";
import { DRONE_LEVEL, MASTER_LEVEL, MUSIC_LEVEL } from "../../src/sound/audio.js";
import { SOUND_KEY, gainOf } from "../../src/sound/settings.js";
import { FakeAudioContext, nodesOf, reaches, sourcesOf } from "./fake-audio.js";

const WIND = { wind: [{ wave: "noise", gain: 0.5, filter: { type: "bandpass", frequency: 500 } }, { wave: "sine", frequency: 90, gain: 0.3 }] };

function fakePage() {
  const page = new EventTarget();
  page.visibilityState = "visible";
  page.touch = () => page.dispatchEvent(new Event("pointerdown"));
  page.hide = (hidden = true) => {
    page.visibilityState = hidden ? "hidden" : "visible";
    page.dispatchEvent(new Event("visibilitychange"));
  };
  return page;
}

function fakeFt(kept) {
  const values = new Map(kept ? [[SOUND_KEY, JSON.stringify(kept)]] : []);
  const closers = [];
  return {
    closers,
    writes: [],
    store: {
      get: async (key) => values.get(key) ?? null,
      async set(key, value) {
        this.owner.writes.push([key, value]);
        return true;
      },
    },
    onClose: (handler) => closers.push(handler),
  };
}

async function make({ kept, spec = {}, AudioContextClass = FakeAudioContext } = {}) {
  const page = fakePage();
  const ft = fakeFt(kept);
  ft.store.owner = ft;
  const sound = createSound(spec, { ft, page, AudioContextClass });
  await sound.ready;
  return { sound, page, ft, context: () => FakeAudioContext.made[0] };
}

async function touched(options) {
  const made = await make(options);
  made.page.touch();
  return { ...made, audio: made.context() };
}

async function playFor(audio, from, to) {
  for (let now = from; now < to; now += 0.15) {
    audio.currentTime = now;
    await vi.advanceTimersByTimeAsync(150);
  }
}

const busOf = (audio, value) => nodesOf(audio, "gain").find((node) => node.gain.value === value && node.outputs.some((next) => next.kind === "gain"));
const masterOf = (audio) => nodesOf(audio, "gain").find((node) => node.outputs.includes(nodesOf(audio, "compressor")[0]));

beforeEach(() => {
  FakeAudioContext.made = [];
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe("the sound of a game", () => {
  it("without Web Audio, does nothing and never throws", async () => {
    const { sound, page } = await make({ AudioContextClass: null, spec: { drones: WIND } });
    page.touch();
    expect(sound.play("win")).toBe(false);
    sound.music("calm");
    sound.drone("wind", { level: 1 });
    sound.pause();
    sound.set({ volume: 0.3 });
    sound.close();
    expect(sound.unlocked).toBe(false);
  });

  it("makes nothing before the first touch, and one running context with it", async () => {
    const { sound, page, context } = await make();
    expect(sound.play("tap")).toBe(false);
    expect(FakeAudioContext.made).toHaveLength(0);
    page.touch();
    page.touch();
    expect(FakeAudioContext.made).toHaveLength(1);
    expect(context().state).toBe("running");
    expect(sound.unlocked).toBe(true);
  });

  it("stays silent and keeps trying when the page refuses to make a context", async () => {
    let refusals = 0;
    class Refused {
      constructor() {
        refusals += 1;
        throw new DOMException("not allowed", "NotAllowedError");
      }
    }
    const { sound, page } = await make({ AudioContextClass: Refused });
    page.touch();
    page.touch();
    expect(refusals).toBe(2);
    expect(sound.play("tap")).toBe(false);
  });

  it("plays an effect at once into the effects, and nothing for a name nobody wrote", async () => {
    const { sound, audio } = await touched();
    const before = sourcesOf(audio).length;
    expect(sound.play("tick")).toBe(true);
    const played = sourcesOf(audio).slice(before);
    expect(played).toHaveLength(EFFECTS.tick.voices.length);
    expect(played[0].started).toBeCloseTo(0.01, 9);
    expect(sound.play("nothing-like-this")).toBe(false);
    expect(sourcesOf(audio)).toHaveLength(before + played.length);
  });

  it("plays an effect louder, softer or higher when asked, and a game's own effects beside the library", async () => {
    const own = { boing: { voices: [{ wave: "sine", frequency: 300, start: 0, duration: 0.1, gain: 0.2, attack: 0.004, shape: "pluck" }] } };
    const { sound, audio } = await touched({ spec: { effects: own } });
    sound.play("pop", { pitch: 2 });
    expect(sourcesOf(audio).at(-1).frequency.events[0].value).toBe(EFFECTS.pop.voices[0].frequency * 2);
    expect(sound.play("boing")).toBe(true);
    expect(sound.play("tap")).toBe(true);
  });

  it("steps the music back for a little tune, and brings it back once the tune is over", async () => {
    const { sound, audio } = await touched();
    sound.music("calm");
    const music = busOf(audio, MUSIC_LEVEL);
    const before = music.gain.events.length;
    sound.play("win");
    const ducked = music.gain.events.slice(before).filter((event) => event.type === "target");
    expect(ducked[0].value).toBeLessThan(MUSIC_LEVEL);
    expect(ducked.at(-1)).toMatchObject({ value: MUSIC_LEVEL });
    expect(ducked.at(-1).time).toBeCloseTo(0.01 + EFFECTS.win.duck, 9);
  });
});

describe("the volume", () => {
  it("at zero sends the context to sleep and plays nothing; up again wakes it", async () => {
    const { sound, audio } = await touched();
    sound.set({ volume: 0 });
    expect(audio.state).toBe("suspended");
    const before = sourcesOf(audio).length;
    expect(sound.play("tap")).toBe(false);
    expect(sourcesOf(audio)).toHaveLength(before);
    sound.set({ volume: 0.5 });
    expect(audio.state).toBe("running");
  });

  it("scales the whole mix at the master, following the ear", async () => {
    const { sound, audio } = await touched();
    sound.set({ volume: 0.5 });
    expect(masterOf(audio).gain.events.at(-1).value).toBeCloseTo(MASTER_LEVEL * gainOf(0.5), 12);
  });

  it("turned down to zero before the first touch, stays silent after it", async () => {
    const { sound, page, context } = await make({ kept: { volume: 0, music: true } });
    expect(sound.settings).toEqual({ volume: 0, music: true });
    page.touch();
    expect(context().state).not.toBe("running");
  });
});

describe("the settings", () => {
  it("come back from the store, and a choice made before they arrive wins", async () => {
    expect((await make({ kept: { volume: 0.3, music: false } })).sound.settings).toEqual({ volume: 0.3, music: false });
    const page = fakePage();
    const ft = fakeFt({ volume: 0.3, music: false });
    ft.store.owner = ft;
    const sound = createSound({}, { ft, page, AudioContextClass: FakeAudioContext });
    sound.set({ volume: 0.8 });
    await sound.ready;
    expect(sound.settings).toEqual({ volume: 0.8, music: true });
  });

  it("tell whoever listens when they change, and are kept only when asked", async () => {
    const { sound, ft } = await make();
    const heard = [];
    const stop = sound.onChange((settings) => heard.push(settings));
    sound.set({ music: false });
    expect(heard).toEqual([{ volume: 1, music: false }]);
    expect(ft.writes).toEqual([]);
    await sound.save();
    expect(ft.writes).toEqual([[SOUND_KEY, '{"volume":1,"music":false}']]);
    stop();
    sound.set({ volume: 0.2 });
    expect(heard).toHaveLength(1);
  });
});

describe("the music", () => {
  it("plays the asked tune only while the music switch is on", async () => {
    const { sound } = await touched();
    sound.music("calm");
    expect(sound.playing).toBe("calm");
    sound.set({ music: false });
    expect(sound.playing).toBeNull();
    sound.music("playful");
    expect(sound.playing).toBeNull();
    sound.set({ music: true });
    expect(sound.playing).toBe("playful");
    sound.music(null);
    expect(sound.playing).toBeNull();
  });

  it("asked for before the first touch, starts with it, and books its notes into the music as time goes", async () => {
    const { sound, page, context } = await make();
    sound.music("playful");
    page.touch();
    const audio = context();
    const music = busOf(audio, MUSIC_LEVEL);
    const booked = () => sourcesOf(audio).filter((source) => reaches(source, music)).length;
    const first = booked();
    expect(first).toBeGreaterThan(0);
    await playFor(audio, 0, 3);
    expect(booked()).toBeGreaterThan(first);
  });

  it("books nothing while the page is hidden, and goes on when it comes back", async () => {
    const { sound, page, audio } = await touched();
    sound.music("calm");
    page.hide();
    expect(audio.state).toBe("suspended");
    const count = sourcesOf(audio).length;
    await playFor(audio, 0, 5);
    expect(sourcesOf(audio)).toHaveLength(count);
    page.hide(false);
    expect(audio.state).toBe("running");
    await playFor(audio, 5, 8);
    expect(sourcesOf(audio).length).toBeGreaterThan(count);
  });
});

describe("a continuous voice", () => {
  it("starts at its level once audio is allowed, follows the level and pitch it is told, and stops", async () => {
    const { sound, page, context } = await make({ spec: { drones: WIND } });
    sound.drone("wind", { level: 0.5, pitch: 1.5 });
    page.touch();
    const audio = context();
    const level = nodesOf(audio, "gain").find((node) => node.outputs.includes(busOf(audio, DRONE_LEVEL)));
    expect(level.gain.events.at(-1)).toMatchObject({ type: "target", value: 0.5 });
    sound.drone("wind", { level: 7 });
    expect(level.gain.events.at(-1)).toMatchObject({ value: 1 });
    const sources = sourcesOf(audio).filter((source) => reaches(source, level));
    sound.drone("wind", null);
    expect(sources.every((source) => source.stopped !== undefined)).toBe(true);
    sound.drone("rain", { level: 1 });
  });

  it("is not told the same thing twice", async () => {
    const { sound, audio } = await touched({ spec: { drones: WIND } });
    sound.drone("wind", { level: 0.5 });
    const level = nodesOf(audio, "gain").find((node) => node.outputs.includes(busOf(audio, DRONE_LEVEL)));
    const told = level.gain.events.length;
    for (let frame = 0; frame < 10; frame += 1) sound.drone("wind", { level: 0.5 });
    expect(level.gain.events).toHaveLength(told);
  });
});

describe("pausing and closing", () => {
  it("pausing steps the music back and silences the continuous voices; going on brings them back", async () => {
    const { sound, audio } = await touched({ spec: { drones: WIND } });
    sound.music("calm");
    const music = busOf(audio, MUSIC_LEVEL);
    const drones = busOf(audio, DRONE_LEVEL);
    sound.pause();
    expect(music.gain.events.at(-1).value).toBeLessThan(MUSIC_LEVEL);
    expect(drones.gain.events.at(-1).value).toBe(0);
    sound.pause(false);
    expect(music.gain.events.at(-1).value).toBe(MUSIC_LEVEL);
    expect(drones.gain.events.at(-1).value).toBe(DRONE_LEVEL);
  });

  it("closing lets the context go, stops listening and stops the clock; the app closing the game does the same", async () => {
    const { sound, page, audio } = await touched();
    sound.music("calm");
    sound.close();
    expect(audio.state).toBe("closed");
    expect(sound.unlocked).toBe(false);
    page.touch();
    expect(FakeAudioContext.made).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
    const other = await touched();
    other.ft.closers.forEach((close) => close());
    expect(other.audio.state).toBe("closed");
  });

  it("closes once, however many times it is told, with a continuous voice running", async () => {
    const { sound, ft, audio } = await touched({ spec: { drones: WIND } });
    sound.drone("wind", { level: 1 });
    sound.close();
    expect(() => ft.closers.forEach((close) => close())).not.toThrow();
    expect(() => sound.close()).not.toThrow();
    expect(audio.calls.filter((call) => call === "close")).toHaveLength(1);
  });
});
