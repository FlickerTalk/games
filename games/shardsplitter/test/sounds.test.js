import { describe, expect, it } from "vitest";
import { EFFECTS } from "../../../kit/src/sound/index.js";
import { SOUND } from "../src/sounds.js";

describe("the game's own sounds", () => {
  it("are a clink for a hit that bounces off and a giggle for a golem that splits, beside the kit's", () => {
    expect(Object.keys(SOUND.effects)).toEqual(["clink", "giggle"]);
    for (const name of Object.keys(SOUND.effects)) expect(EFFECTS, name).not.toHaveProperty(name);
  });

  it("are short and quiet enough to sit over the music", () => {
    for (const [name, effect] of Object.entries(SOUND.effects)) {
      expect(effect.voices.length, name).toBeGreaterThan(0);
      for (const voice of effect.voices) {
        expect(voice.start + voice.duration, name).toBeLessThanOrEqual(0.6);
        expect(voice.gain, name).toBeLessThanOrEqual(0.35);
        expect(Number.isFinite(voice.frequency), name).toBe(true);
      }
    }
  });
});
