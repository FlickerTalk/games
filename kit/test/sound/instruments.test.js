import { describe, expect, it } from "vitest";
import { INSTRUMENTS, instrumentVoices } from "../../src/sound/instruments.js";
import { note } from "../../src/sound/notes.js";
import { expectSoft } from "./checks.js";

const event = (instrument, extra = {}) => ({ instrument, sound: "A4", frequency: note("A4"), duration: 0.5, volume: 1, ...extra });

describe("the instruments", () => {
  it("are a flute, a harp, a bell, a bass and light drums", () => {
    expect([...INSTRUMENTS].sort()).toEqual(["bass", "bell", "drums", "flute", "harp"]);
  });

  it("each play a note with soft voices that start with it", () => {
    for (const instrument of INSTRUMENTS.filter((one) => one !== "drums")) {
      const voices = instrumentVoices(event(instrument, { frequency: note(instrument === "bass" ? "A2" : "A4") }));
      expect(voices.length, instrument).toBeGreaterThan(0);
      voices.forEach((voice, at) => expectSoft(voice, `${instrument}[${at}]`));
      expect(voices.every((voice) => voice.start === 0)).toBe(true);
    }
  });

  it("follow the note's pitch, and the bass stays low with no hiss above it", () => {
    expect(instrumentVoices(event("flute", { frequency: 500 }))[0].frequency).toBe(500);
    const bass = instrumentVoices(event("bass", { frequency: note("E2") }));
    expect(bass.some((voice) => voice.filter?.type === "lowpass")).toBe(true);
  });

  it("play a kick, a hat and a snare, and refuse any other drum", () => {
    for (const sound of ["k", "h", "s"]) {
      const voices = instrumentVoices({ instrument: "drums", sound, duration: 0.25, volume: 1 });
      voices.forEach((voice, at) => expectSoft(voice, `${sound}[${at}]`));
    }
    expect(() => instrumentVoices({ instrument: "drums", sound: "x", duration: 0.25 })).toThrow("drum");
  });

  it("scale with the track's volume, and refuse an instrument nobody wrote", () => {
    const full = instrumentVoices(event("harp"));
    const half = instrumentVoices(event("harp", { volume: 0.5 }));
    expect(half[0].gain).toBeCloseTo(full[0].gain / 2, 12);
    expect(() => instrumentVoices(event("tuba"))).toThrow("instrument");
  });
});
