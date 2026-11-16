import { describe, expect, it } from "vitest";
import { FixedSteps } from "../../src/duel/steps.js";

const run = (steps, frames) => frames.map((now) => steps.due(now));

describe("fixed simulation steps", () => {
  it("runs nothing on the first frame, then as many whole steps as the frames add up to", () => {
    const steps = new FixedSteps({ step: 10 });
    expect(steps.due(1000)).toBe(0);
    expect(run(steps, [1016, 1032, 1048, 1064])).toEqual([1, 2, 1, 2]);
    expect(steps.total).toBe(6);
  });

  it("gives the same steps whatever the frame rate, so the simulation never depends on frame timing", () => {
    const fast = new FixedSteps({ step: 1000 / 120 });
    const slow = new FixedSteps({ step: 1000 / 120 });
    const fastFrames = Array.from({ length: 121 }, (_, at) => at * (1000 / 120));
    const slowFrames = Array.from({ length: 31 }, (_, at) => at * (1000 / 30));
    const sum = (list) => list.reduce((one, two) => one + two, 0);
    expect(sum(run(fast, fastFrames))).toBe(120);
    expect(sum(run(slow, slowFrames))).toBe(120);
  });

  it("runs at most a few steps for one late frame, and none after a stall, instead of racing to catch up", () => {
    const steps = new FixedSteps({ step: 10, most: 5, stall: 250 });
    steps.due(0);
    expect(steps.due(120)).toBe(5);
    expect(steps.due(130)).toBe(1);
    expect(steps.due(2000)).toBe(0);
    expect(steps.due(2010)).toBe(1);
  });

  it("forgets the last frame when reset, after a pause or a hidden page", () => {
    const steps = new FixedSteps({ step: 10 });
    steps.due(0);
    steps.due(15);
    steps.reset();
    expect(steps.due(500)).toBe(0);
    expect(steps.due(510)).toBe(1);
  });

  it("ignores a frame that goes back in time", () => {
    const steps = new FixedSteps({ step: 10 });
    steps.due(100);
    expect(steps.due(90)).toBe(0);
    expect(steps.due(110)).toBe(2);
  });
});
