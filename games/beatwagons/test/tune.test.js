import { describe, expect, it, vi } from "vitest";
import { INSTRUMENTS, SOUND, STEP_MS, playWagon, tuneLength, tuneOf } from "../src/tune.js";
import { KINDS, wagonOf } from "../src/train.js";

describe("a train's tune", () => {
  it("gives each of the eight wagons an instrument of its own, made of voices and never of a file", () => {
    expect(INSTRUMENTS).toHaveLength(KINDS);
    expect(new Set(INSTRUMENTS).size).toBe(KINDS);
    for (const name of INSTRUMENTS) {
      const { voices } = SOUND.effects[name];
      expect(voices.length, name).toBeGreaterThan(0);
      for (const voice of voices) expect(voice.start + voice.duration, name).toBeLessThan(0.6);
    }
    expect(new Set(INSTRUMENTS.map((name) => JSON.stringify(SOUND.effects[name].voices))).size).toBe(KINDS);
  });

  it("plays one wagon after another, a wagon of two or three beats that many times inside its step", () => {
    const tune = tuneOf([wagonOf(0, 1), wagonOf(1, 3), wagonOf(2, 2)]);
    expect(tune.map(({ index }) => index)).toEqual([0, 1, 1, 1, 2, 2]);
    expect(tune[0].at).toBe(0);
    expect(tune[1].at).toBe(STEP_MS);
    expect(tune[3].at).toBeLessThan(2 * STEP_MS);
    expect(tune[5].at).toBe(2.5 * STEP_MS);
    expect(tuneLength([0, 0, 0])).toBeGreaterThan(3 * STEP_MS);
  });

  it("leaves at least 140 ms between two beats of a wagon", () => {
    expect(STEP_MS / 3).toBeGreaterThanOrEqual(140);
  });

  it("asks the kit's sound for the wagon's instrument", () => {
    const sound = { play: vi.fn() };
    playWagon(sound, wagonOf(1, 2), { gain: 0.5 });
    expect(sound.play).toHaveBeenCalledWith("bell", { gain: 0.5 });
  });
});
