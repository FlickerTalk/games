import { expect } from "vitest";

const SOFT_WAVES = ["sine", "triangle", "noise"];
const FILTERS = ["lowpass", "highpass", "bandpass"];

export function expectSoft(voice, label, { highest = 2400, lowest = 40 } = {}) {
  expect(SOFT_WAVES, `${label}: wave`).toContain(voice.wave);
  expect(voice.start, `${label}: start`).toBeGreaterThanOrEqual(0);
  expect(voice.duration, `${label}: duration`).toBeGreaterThan(0);
  expect(voice.duration, `${label}: duration`).toBeLessThanOrEqual(2);
  expect(voice.gain, `${label}: gain`).toBeGreaterThan(0);
  expect(voice.gain, `${label}: gain`).toBeLessThanOrEqual(0.4);
  expect(voice.attack, `${label}: attack`).toBeGreaterThanOrEqual(0.002);
  expect(["pluck", "hold"], `${label}: shape`).toContain(voice.shape);
  for (const frequency of [voice.frequency, voice.toFrequency].filter((value) => value !== undefined)) {
    expect(frequency, `${label}: ${frequency} Hz`).toBeGreaterThanOrEqual(lowest);
    expect(frequency, `${label}: ${frequency} Hz`).toBeLessThanOrEqual(highest);
  }
  expect(voice.wave === "noise", `${label}: noise has no pitch, a tone has one`).toBe(voice.frequency === undefined);
  if (voice.filter) {
    expect(FILTERS, `${label}: filter`).toContain(voice.filter.type);
    expect(voice.filter.frequency, `${label}: filter`).toBeGreaterThan(20);
    expect(voice.filter.frequency, `${label}: filter`).toBeLessThan(12000);
  }
}

export function loudestMoment(voices) {
  return Math.max(
    ...voices.map((one) => voices.filter((other) => other.start <= one.start && one.start < other.start + other.duration).reduce((sum, other) => sum + other.gain, 0)),
  );
}

export const lastsFor = (voices) => Math.max(...voices.map((voice) => voice.start + voice.duration));
