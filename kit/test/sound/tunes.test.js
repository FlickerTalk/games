import { describe, expect, it } from "vitest";
import { TUNES } from "../../src/sound/tunes.js";
import { compileScore, parseTrack } from "../../src/sound/score.js";
import { note } from "../../src/sound/notes.js";

const stepsOf = (track) => parseTrack(track.notes).reduce((sum, one) => sum + one.steps, 0);
const loopSteps = (tune) => tune.bars * tune.beatsPerBar * tune.stepsPerBeat;
const pitched = (track) => parseTrack(track.notes).filter((one) => one.sound).map((one) => one.sound);
const melody = (tune) => tune.tracks[0];
const notesPerSecond = (tune) => pitched(melody(tune)).length / compileScore(tune).loopSeconds;

describe("the ready-made tunes", () => {
  it("are one light and playful, one calm and sparse for the serious games", () => {
    expect(Object.keys(TUNES).sort()).toEqual(["calm", "playful"]);
    expect(TUNES.playful.tempo).toBeGreaterThanOrEqual(104);
    expect(TUNES.calm.tempo).toBeLessThanOrEqual(80);
    expect(notesPerSecond(TUNES.calm)).toBeLessThan(notesPerSecond(TUNES.playful) / 2);
  });

  it("loop over 16 bars, long enough not to tire quickly and short enough to stay small", () => {
    for (const [name, tune] of Object.entries(TUNES)) {
      expect(tune.bars, name).toBe(16);
      const { loopSeconds } = compileScore(tune);
      expect(loopSeconds, name).toBeGreaterThanOrEqual(25);
      expect(loopSeconds, name).toBeLessThanOrEqual(60);
      expect(new TextEncoder().encode(JSON.stringify(tune)).length, name).toBeLessThan(2048);
    }
  });

  it("have a melody written from start to end, and a bass", () => {
    for (const [name, tune] of Object.entries(TUNES)) {
      expect(stepsOf(melody(tune)), name).toBe(loopSteps(tune));
      expect(tune.tracks.some((track) => track.instrument === "bass"), name).toBe(true);
    }
  });

  it("keep the drums light in the playful one, and leave them out of the calm one", () => {
    const drums = TUNES.playful.tracks.find((track) => track.instrument === "drums");
    expect(drums.volume).toBeLessThanOrEqual(0.6);
    expect(TUNES.calm.tracks.some((track) => track.instrument === "drums")).toBe(false);
  });

  it("sing where a small speaker sings, the bass low under it", () => {
    for (const [name, tune] of Object.entries(TUNES)) {
      for (const track of tune.tracks.filter((one) => one.instrument !== "drums")) {
        const [low, high] = track.instrument === "bass" ? ["E2", "C4"] : ["G3", "C7"];
        for (const sound of pitched(track)) {
          expect(note(sound), `${name} ${track.instrument} ${sound}`).toBeGreaterThanOrEqual(note(low) - 0.01);
          expect(note(sound), `${name} ${track.instrument} ${sound}`).toBeLessThanOrEqual(note(high) + 0.01);
        }
      }
    }
  });

  it("come home to their key note at the end of the loop", () => {
    for (const [name, tune] of Object.entries(TUNES)) {
      expect(pitched(melody(tune)).at(-1).replace(/\d$/, ""), name).toBe(tune.key.split(" ")[0]);
    }
  });

  it("are two different tunes", () => {
    expect(melody(TUNES.calm).notes).not.toBe(melody(TUNES.playful).notes);
    expect(TUNES.calm.key).not.toBe(TUNES.playful.key);
  });
});
