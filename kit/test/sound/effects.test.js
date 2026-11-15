import { describe, expect, it } from "vitest";
import { EFFECTS, effectVoices } from "../../src/sound/effects.js";
import { expectSoft, lastsFor, loudestMoment } from "./checks.js";

const NAMES = Object.keys(EFFECTS);
const pitched = (name) => EFFECTS[name].voices.filter((voice) => voice.frequency !== undefined).sort((one, two) => one.start - two.start);
const first = (name) => pitched(name)[0].frequency;
const last = (name) => [...pitched(name)].sort((one, two) => two.start - one.start || two.frequency - one.frequency)[0].frequency;
const SMALL = ["tap", "place", "pick", "pop", "tick", "bounce", "error-soft", "collect"];
const TUNES = ["win", "lose-soft", "success", "star"];

describe("the ready-made effects", () => {
  it("cover what most games need", () => {
    expect([...NAMES].sort()).toEqual(
      ["bounce", "collect", "error-soft", "lose-soft", "pick", "place", "pop", "splash", "star", "success", "tap", "tick", "whoosh", "win"].sort(),
    );
  });

  it("are soft: gentle waves, never an instant attack, a moderate level and a range that never shrieks", () => {
    for (const name of NAMES) {
      const { voices } = EFFECTS[name];
      expect(voices.length, name).toBeGreaterThan(0);
      voices.forEach((voice, at) => expectSoft(voice, `${name}[${at}]`));
      expect(loudestMoment(voices), name).toBeLessThanOrEqual(0.5);
    }
  });

  it("are short, the small ones a blink, and the win between one and two seconds", () => {
    for (const name of NAMES) expect(lastsFor(EFFECTS[name].voices), name).toBeLessThanOrEqual(2);
    for (const name of SMALL) expect(lastsFor(EFFECTS[name].voices), name).toBeLessThanOrEqual(0.4);
    expect(lastsFor(EFFECTS.win.voices)).toBeGreaterThanOrEqual(1);
  });

  it("climb when something good happens, and losing or a mistake never drops hard", () => {
    for (const name of ["win", "success", "star", "collect"]) expect(last(name), name).toBeGreaterThan(first(name));
    for (const name of ["lose-soft", "error-soft"]) {
      const notes = pitched(name);
      expect(Math.min(...notes.map((voice) => voice.toFrequency ?? voice.frequency)) / notes[0].frequency, name).toBeGreaterThan(0.8);
    }
    expect(loudestMoment(EFFECTS["error-soft"].voices)).toBeLessThanOrEqual(loudestMoment(EFFECTS.tap.voices) * 1.5);
  });

  it("ask the music to step back for the little tunes, and not for the small sounds", () => {
    for (const name of TUNES) expect(EFFECTS[name].duck, name).toBeGreaterThanOrEqual(lastsFor(EFFECTS[name].voices) * 0.8);
    for (const name of NAMES.filter((one) => !TUNES.includes(one))) expect(EFFECTS[name].duck, name).toBe(0);
  });

  it("make the splash and the whoosh of noise", () => {
    expect(EFFECTS.splash.voices.some((voice) => voice.wave === "noise")).toBe(true);
    expect(EFFECTS.whoosh.voices.every((voice) => voice.wave === "noise")).toBe(true);
  });
});

describe("a named effect", () => {
  it("gives its voices, louder, softer, higher or later as asked", () => {
    const { voices, duck } = effectVoices(EFFECTS, "pop", { gain: 0.5, pitch: 2, delay: 0.1 });
    expect(duck).toBe(0);
    expect(voices[0].gain).toBeCloseTo(EFFECTS.pop.voices[0].gain / 2, 12);
    expect(voices[0].frequency).toBe(EFFECTS.pop.voices[0].frequency * 2);
    expect(voices[0].start).toBeCloseTo(EFFECTS.pop.voices[0].start + 0.1, 12);
    expect(effectVoices(EFFECTS, "win").duck).toBe(EFFECTS.win.duck);
  });

  it("is nothing when nobody wrote it", () => {
    expect(effectVoices(EFFECTS, "crash-bang")).toBeNull();
    expect(effectVoices(EFFECTS, "toString")).toBeNull();
  });
});
