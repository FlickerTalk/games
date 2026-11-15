import { describe, expect, it } from "vitest";
import { note } from "../../src/sound/notes.js";

describe("a note's pitch", () => {
  it("is A4 at 440 Hz, an octave doubling it and a semitone the twelfth root of two", () => {
    expect(note("A4")).toBe(440);
    expect(note("A5")).toBe(880);
    expect(note("A3")).toBe(220);
    expect(note("C4")).toBeCloseTo(261.626, 3);
    expect(note("A#4") / note("A4")).toBeCloseTo(2 ** (1 / 12), 12);
  });

  it("reads sharps and flats, the same key twice spelled", () => {
    expect(note("F#5")).toBeCloseTo(note("Gb5"), 9);
    expect(note("Bb3")).toBeCloseTo(note("A#3"), 9);
    expect(note("E2")).toBeCloseTo(82.407, 3);
  });

  it("refuses anything that is not a note", () => {
    for (const bad of ["H4", "C", "4", "C#", "c4", "C44", "", "Cb#4"]) expect(() => note(bad), bad).toThrow("not a note");
  });
});
