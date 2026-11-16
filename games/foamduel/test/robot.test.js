// @vitest-environment node
import { describe, expect, it } from "vitest";
import { FLOOR_MS, WINDOW_MS, scheduleOf } from "../src/duel.js";
import { flickPlan, flickReaction } from "../src/robot.js";

const SEEDS = ["a1", "b2", "c3", "d4", "e5", "f6", "g7", "h8"];
const plans = (fakes) => SEEDS.flatMap((seed) => {
  const schedule = scheduleOf(seed, { fakes, seconds: 90 });
  return flickPlan(seed, schedule).map((one, at) => ({ one, exchange: schedule[at] }));
});
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;

describe("Flick with a foam sword", () => {
  it("plans the same round the same way every time, one answer an exchange", () => {
    const schedule = scheduleOf("same", { fakes: 1, seconds: 60 });
    expect(flickPlan("same", schedule)).toEqual(flickPlan("same", schedule));
    expect(flickPlan("same", schedule)).toHaveLength(schedule.length);
    expect(flickPlan("same", schedule)).not.toEqual(flickPlan("other", schedule));
  });

  it("answers the bell around its level's time, never the same twice, always a time a person could have", () => {
    const times = plans(0).filter(({ one }) => one.early === null).map(({ one }) => flickReaction(one, { react: 640, lead: 0 }));
    expect(mean(times)).toBeGreaterThan(600);
    expect(mean(times)).toBeLessThan(680);
    expect(new Set(times).size).toBeGreaterThan(times.length / 3);
    for (const time of times) {
      expect(Number.isInteger(time)).toBe(true);
      expect(time).toBeGreaterThanOrEqual(FLOOR_MS + 60);
      expect(time).toBeLessThan(WINDOW_MS);
    }
    const quick = plans(0).map(({ one }) => flickReaction(one, { react: 400, lead: 0 }));
    expect(mean(quick)).toBeLessThan(mean(times) - 200);
    expect(Math.min(...quick)).toBeGreaterThanOrEqual(FLOOR_MS + 60);
  });

  it("eases off while it is ahead and tries a little harder while it is behind", () => {
    const [plan] = plans(0).map(({ one }) => one);
    const even = flickReaction(plan, { react: 500, lead: 0 });
    expect(flickReaction(plan, { react: 500, lead: 3 })).toBeGreaterThan(even * 1.2);
    expect(flickReaction(plan, { react: 500, lead: -3 })).toBeLessThan(even);
    expect(flickReaction(plan, { react: 500, lead: -3 })).toBeGreaterThan(even * 0.85);
  });

  it("now and then jumps before the bell, more often when a lure flies by, and then just after the lure", () => {
    const plain = plans(0);
    const lured = plans(1.2);
    const share = (all) => all.filter(({ one }) => one.early !== null).length / all.length;
    expect(share(plain)).toBeGreaterThan(0);
    expect(share(plain)).toBeLessThan(0.1);
    expect(share(lured)).toBeGreaterThan(share(plain) * 1.5);
    expect(share(lured)).toBeLessThan(0.3);
    for (const { one, exchange } of [...plain, ...lured]) {
      if (one.early === null) continue;
      expect(one.early).toBeGreaterThan(exchange.ready);
      expect(one.early).toBeLessThan(exchange.signal);
      if (exchange.fakes.length) expect(exchange.fakes.some((fake) => one.early > fake.at && one.early <= fake.at + 20)).toBe(true);
    }
  });
});
