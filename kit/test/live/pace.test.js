import { describe, expect, it } from "vitest";
import { Pacer } from "../../src/live/pace.js";

describe("the pace of sending", () => {
  it("lets one message go at most every so often, about twelve a second by default", () => {
    const pacer = new Pacer();
    expect(pacer.every).toBe(83);
    expect(pacer.due(0)).toBe(true);
    pacer.sent(0);
    pacer.done();
    expect(pacer.due(50)).toBe(false);
    expect(pacer.due(83)).toBe(true);
  });

  it("waits for the core to take the last one before the next, so nothing piles up on a slow channel", () => {
    const pacer = new Pacer({ every: 100 });
    pacer.sent(0);
    expect(pacer.due(500)).toBe(false);
    pacer.done();
    expect(pacer.due(500)).toBe(true);
  });

  it("stops waiting for an answer the core has not given in a second, so one lost answer cannot silence the phone", () => {
    const pacer = new Pacer({ every: 100 });
    pacer.sent(0);
    expect(pacer.due(999)).toBe(false);
    expect(pacer.due(1000)).toBe(true);
    pacer.sent(1000);
    expect(pacer.due(1500)).toBe(false);
  });

  it("starts over for a new race", () => {
    const pacer = new Pacer({ every: 100 });
    pacer.sent(1000);
    pacer.reset();
    expect(pacer.due(1001)).toBe(true);
  });
});
