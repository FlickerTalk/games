// @vitest-environment node
import { describe, expect, it } from "vitest";
import { LiveClock } from "../../src/duel/clock.js";

function pair({ skew, latency, jitter = () => 0 }) {
  const mine = new LiveClock();
  const theirs = new LiveClock();
  for (let at = 0; at < 30; at += 1) {
    const sentByThem = 1000 + at * 83;
    mine.heard(sentByThem, sentByThem + skew + latency + jitter(at));
    const sentByMe = 1000 + at * 83 + 40;
    theirs.heard(sentByMe, sentByMe - skew + latency + jitter(at + 7));
  }
  mine.told(theirs.offset);
  theirs.told(mine.offset);
  return { mine, theirs };
}

describe("the other phone's clock", () => {
  it("knows nothing before the first arrival", () => {
    const clock = new LiveClock();
    expect(clock.offset).toBeNull();
    expect(clock.latency).toBeNull();
    expect(clock.theirNow(500)).toBeNull();
  });

  it("finds the one-way delay from both phones' fastest arrivals, whatever the clocks' difference", () => {
    const { mine, theirs } = pair({ skew: 700, latency: 40, jitter: (at) => (at % 3) * 25 });
    expect(mine.latency).toBeCloseTo(40, 5);
    expect(theirs.latency).toBeCloseTo(40, 5);
    expect(mine.theirNow(5000)).toBeCloseTo(4300, 5);
    expect(theirs.theirNow(4300)).toBeCloseTo(5000, 5);
  });

  it("says how long ago a moment of the other phone's clock was", () => {
    const { mine } = pair({ skew: -120, latency: 30 });
    const sent = 2000;
    const arrived = sent - 120 + 30;
    expect(mine.age(sent, arrived)).toBeCloseTo(30, 5);
    expect(mine.age(sent, arrived + 100)).toBeCloseTo(130, 5);
    expect(mine.age(sent + 5000, arrived)).toBe(0);
  });

  it("takes the delay as nothing until the other phone has said its own offset, and never more than a second", () => {
    const clock = new LiveClock();
    clock.heard(1000, 1300);
    expect(clock.latency).toBeNull();
    expect(clock.theirNow(1300)).toBe(1000);
    clock.told(5000);
    expect(clock.latency).toBe(1000);
    clock.told("soon");
    expect(clock.latency).toBe(1000);
  });

  it("follows a change of route: the fastest arrival is looked for among the latest ones only", () => {
    const clock = new LiveClock({ window: 5 });
    for (let at = 0; at < 5; at += 1) clock.heard(at * 100, at * 100 + 20);
    expect(clock.offset).toBe(20);
    for (let at = 5; at < 10; at += 1) clock.heard(at * 100, at * 100 + 90);
    expect(clock.offset).toBe(90);
  });

  it("starts again from nothing when reset", () => {
    const { mine } = pair({ skew: 0, latency: 50 });
    mine.reset();
    expect(mine.offset).toBeNull();
    expect(mine.latency).toBeNull();
  });
});
