import { describe, expect, it } from "vitest";
import { compileScore, eventsBetween, parseTrack } from "../../src/sound/score.js";
import { note } from "../../src/sound/notes.js";

const tiny = {
  tempo: 120,
  stepsPerBeat: 2,
  beatsPerBar: 4,
  bars: 2,
  tracks: [
    { instrument: "flute", notes: "C5:2 E5:2 G5:4 r:6 C6:2" },
    { instrument: "drums", notes: "k h s h", volume: 0.5 },
  ],
};

describe("a tune's score", () => {
  it("reads notes, drum hits and rests, each with its length in steps", () => {
    expect(parseTrack("C5:2 r:3 F#4 k h:2")).toEqual([
      { sound: "C5", steps: 2 },
      { sound: null, steps: 3 },
      { sound: "F#4", steps: 1 },
      { sound: "k", steps: 1 },
      { sound: "h", steps: 2 },
    ]);
  });

  it("refuses a token that is neither a note, a drum nor a rest", () => {
    for (const bad of ["X5", "C5:0", "C5:-1", "C5:x", "kick"]) expect(() => parseTrack(bad), bad).toThrow();
  });

  it("puts the notes on the tempo's grid, with their pitch, length and the track's volume", () => {
    const song = compileScore(tiny);
    expect(song.stepSeconds).toBe(0.25);
    expect(song.loopSeconds).toBe(4);
    const flute = song.events.filter((event) => event.instrument === "flute");
    expect(flute.map((event) => [event.time, event.duration])).toEqual([[0, 0.5], [0.5, 0.5], [1, 1], [3.5, 0.5]]);
    expect(flute[2].frequency).toBeCloseTo(note("G5"), 9);
    expect(flute[0].volume).toBe(1);
  });

  it("repeats a short pattern until the tune is full, the events in time order", () => {
    const song = compileScore(tiny);
    const drums = song.events.filter((event) => event.instrument === "drums");
    expect(drums).toHaveLength(16);
    expect(drums.slice(0, 5).map((event) => event.sound)).toEqual(["k", "h", "s", "h", "k"]);
    expect(drums[0].volume).toBe(0.5);
    expect(drums[0].frequency).toBeUndefined();
    const times = song.events.map((event) => event.time);
    expect(times).toEqual([...times].sort((one, two) => one - two));
  });

  it("refuses a pattern that does not fill the tune a whole number of times", () => {
    expect(() => compileScore({ ...tiny, tracks: [{ instrument: "flute", notes: "C5:3" }] })).toThrow("do not fill");
    expect(() => compileScore({ ...tiny, tracks: [{ instrument: "flute", notes: "C5:32" }] })).toThrow("do not fill");
  });
});

describe("the sequencer's clock", () => {
  it("gives the events that start inside a window, going round the loop", () => {
    const song = compileScore(tiny);
    const flute = (from, to) => eventsBetween(song, 10, from, to).filter((event) => event.instrument === "flute");
    expect(flute(10, 11).map((event) => event.at)).toEqual([10, 10.5]);
    expect(flute(13.4, 14.6).map((event) => event.at)).toEqual([13.5, 14, 14.5]);
    expect(flute(5, 10)).toEqual([]);
    expect(flute(12, 12)).toEqual([]);
  });

  it("plays every note once over back-to-back windows, with no gap and no repeat where the loop turns", () => {
    const song = compileScore(tiny);
    const heard = [];
    for (let from = 0; from < 12; from += 0.37) heard.push(...eventsBetween(song, 0, from, Math.min(12, from + 0.37)));
    expect(heard).toHaveLength(song.events.length * 3);
    const starts = heard.map((event) => `${event.instrument}@${event.at.toFixed(6)}`);
    expect(new Set(starts).size).toBe(starts.length);
  });
});
