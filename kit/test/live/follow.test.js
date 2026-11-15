import { describe, expect, it } from "vitest";
import { Follow } from "../../src/live/follow.js";

describe("the other phone's entity, drawn from what arrives", () => {
  it("is shown a little behind, between the two states around that moment of the other phone's clock", () => {
    const follow = new Follow({ delay: 100 });
    expect(follow.at(1000)).toBeNull();
    follow.push({ x: 0, y: 4 }, 0, 1000);
    follow.push({ x: 10, y: 8 }, 100, 1100);
    expect(follow.at(1150)).toEqual({ x: 5, y: 6 });
    expect(follow.at(1100)).toEqual({ x: 0, y: 4 });
  });

  it("is carried on from the last two states when nothing newer has come, but only a short way", () => {
    const follow = new Follow({ delay: 100, ahead: 250 });
    follow.push({ x: 0 }, 0, 1000);
    follow.push({ x: 10 }, 100, 1100);
    expect(follow.at(1300).x).toBeCloseTo(20, 9);
    expect(follow.at(5000).x).toBeCloseTo(35, 9);
    expect(follow.at(60_000).x).toBeCloseTo(35, 9);
  });

  it("jumps to the newest state after a stall, never playing back what piled up", () => {
    const follow = new Follow({ delay: 100 });
    follow.push({ x: 0 }, 0, 1000);
    for (let t = 100; t <= 2000; t += 100) follow.push({ x: t / 10 }, t, 3100);
    expect(follow.at(3100)).toEqual({ x: 200 });
    expect(follow.size).toBeLessThanOrEqual(3);
  });

  it("ignores a state older than one it has, or the same one again", () => {
    const follow = new Follow({ delay: 0 });
    expect(follow.push({ x: 1 }, 100, 1000)).toBe(true);
    expect(follow.push({ x: 999 }, 100, 1001)).toBe(false);
    expect(follow.push({ x: 999 }, 50, 1002)).toBe(false);
    expect(follow.push({ x: 999 }, Number.NaN, 1003)).toBe(false);
    expect(follow.at(1000)).toEqual({ x: 1 });
  });

  it("turns angles the short way round, and takes what is not a number from the newer state", () => {
    const follow = new Follow({ delay: 0, angles: ["a"] });
    follow.push({ a: 3.1, lane: "left" }, 0, 1000);
    follow.push({ a: -3.1, lane: "right" }, 100, 1100);
    const half = follow.at(1050);
    expect(Math.abs(Math.abs(half.a) - Math.PI)).toBeLessThan(0.01);
    expect(half.lane).toBe("right");
  });

  it("follows the fastest a message has come as the other phone's clock, so a slow one does not hold it back", () => {
    const follow = new Follow({ delay: 0 });
    follow.push({ x: 0 }, 0, 1300);
    follow.push({ x: 10 }, 100, 1100);
    follow.push({ x: 20 }, 200, 1200);
    expect(follow.at(1150)).toEqual({ x: 15 });
  });

  it("forgets everything for a new race", () => {
    const follow = new Follow();
    follow.push({ x: 1 }, 10, 10);
    follow.reset();
    expect(follow.at(20)).toBeNull();
    expect(follow.push({ x: 2 }, 5, 30)).toBe(true);
  });
});
