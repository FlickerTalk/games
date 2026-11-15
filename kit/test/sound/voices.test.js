import { describe, expect, it } from "vitest";
import { hold, noise, pluck, scaled, shape } from "../../src/sound/voices.js";

const times = (steps) => steps.map(([, , time]) => time);

describe("a voice", () => {
  it("is plain data: a wave, a pitch, when it starts, how long and how loud", () => {
    expect(pluck("sine", 440, 0.1, 0.3, 0.2)).toEqual({ wave: "sine", frequency: 440, start: 0.1, duration: 0.3, gain: 0.2, attack: 0.004, shape: "pluck" });
    expect(hold("triangle", 220, 0, 0.5, 0.1, { release: 0.2 })).toMatchObject({ shape: "hold", attack: 0.02, release: 0.2 });
    expect(hold("sine", 220, 0, 0.1, 0.1).release).toBe(0.05);
    const hiss = noise(0, 0.2, 0.1, { type: "bandpass", frequency: 900 });
    expect(hiss).toMatchObject({ wave: "noise", filter: { type: "bandpass", frequency: 900 } });
    expect(hiss.frequency).toBeUndefined();
  });

  it("plucked, rises from silence to its level, then dies away and is silent when it ends", () => {
    const steps = shape(pluck("sine", 440, 0.1, 0.3, 0.2), 2);
    expect(steps[0]).toEqual(["set", 0, 2.1]);
    expect(steps[1]).toEqual(["linear", 0.2, 2.1 + 0.004]);
    expect(steps.at(-2)[0]).toBe("exponential");
    expect(steps.at(-2)[1]).toBeGreaterThan(0);
    expect(steps.at(-1)).toEqual(["set", 0, 2.4]);
  });

  it("held, keeps its level until its release, then fades to silence by its end", () => {
    const steps = shape(hold("sine", 220, 0, 1, 0.1, { release: 0.25 }), 0);
    expect(steps).toEqual([
      ["set", 0, 0],
      ["linear", 0.1, 0.02],
      ["set", 0.1, 0.75],
      ["linear", 0, 1],
    ]);
  });

  it("never schedules a step before the one it follows", () => {
    for (const voice of [pluck("sine", 440, 0, 0.003, 0.2), hold("sine", 440, 0, 0.01, 0.2, { attack: 0.05 }), hold("sine", 440, 0.5, 0.2, 0.2)]) {
      const at = times(shape(voice, 1));
      expect(at).toEqual([...at].sort((one, two) => one - two));
    }
  });
});

describe("a voice played louder, softer, higher or later", () => {
  const voices = [pluck("sine", 400, 0, 0.2, 0.3, { toFrequency: 800 }), noise(0.1, 0.2, 0.2, { type: "lowpass", frequency: 1000, toFrequency: 500 })];

  it("scales every gain, pitch and filter, and shifts every start, never touching the description it came from", () => {
    const played = scaled(voices, { gain: 0.5, pitch: 2, delay: 0.25 });
    expect(played[0]).toMatchObject({ gain: 0.15, frequency: 800, toFrequency: 1600, start: 0.25 });
    expect(played[1]).toMatchObject({ gain: 0.1, start: 0.35, filter: { frequency: 2000, toFrequency: 1000 } });
    expect(voices[0]).toMatchObject({ gain: 0.3, frequency: 400, start: 0 });
    expect(voices[1].filter.frequency).toBe(1000);
  });

  it("keeps the gain between silence and the level it was written at, and ignores nonsense", () => {
    expect(scaled(voices, { gain: 3 })[0].gain).toBe(0.3);
    expect(scaled(voices, { gain: -1 })[0].gain).toBe(0);
    expect(scaled(voices, { gain: Number.NaN, pitch: 0, delay: -4 })[0]).toMatchObject({ gain: 0.3, frequency: 400, start: 0 });
    expect(scaled(voices)).toEqual(voices);
  });
});
