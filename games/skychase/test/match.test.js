import { describe, expect, it } from "vitest";
import { BALLOONS } from "../src/arena.js";
import { OUT_SHOW, SAFE } from "../src/craft.js";
import { LOCK, RANGE, TRAIL, balloonsOf, closing, createMatch, learnLost, onTail, placeOther, scoreOf, seenBy, stepMatch } from "../src/match.js";

const BOTH = [true, true];

function chase({ behind = 0.2, families = ["plane", "plane"], twists = 0 } = {}) {
  const match = createMatch({ seed: "seedAAAA", twists, roundSteps: 120 * 35, families });
  const [hunter, prey] = match.crafts;
  Object.assign(prey, { x: 0.5, y: 0.6, hx: 0, hy: -1 });
  Object.assign(hunter, { x: 0.5, y: 0.6 + behind, hx: 0, hy: -1 });
  return match;
}

const stepsToPop = (prey) => Math.ceil(LOCK / closing(prey));

function run(match, steps, own = BOTH) {
  const events = [];
  for (let step = 0; step < steps && !match.over; step += 1) events.push(...stepMatch(match, own));
  return events;
}

describe("a chase", () => {
  it("starts with three balloons each, nobody aimed at, in the sky its seed and twists build", () => {
    const match = createMatch({ seed: "seedAAAA", twists: 4, roundSteps: 4200, families: ["plane", "helicopter"] });
    expect(match.crafts.map((one) => one.family)).toEqual(["plane", "helicopter"]);
    expect([balloonsOf(match, 0), balloonsOf(match, 1)]).toEqual([BALLOONS, BALLOONS]);
    expect([scoreOf(match, 0), scoreOf(match, 1)]).toEqual([0, 0]);
    expect(match.sky.airship).not.toBeNull();
    expect(run(match, 60)).toEqual([]);
  });

  it("counts an aircraft as on the other's tail only behind it, near it and pointing at it", () => {
    const match = chase();
    const [hunter, prey] = match.crafts;
    expect(onTail(match, hunter, prey)).toBe(true);
    expect(onTail(match, prey, hunter)).toBe(false);
    hunter.y = prey.y + RANGE * 1.1;
    expect(onTail(match, hunter, prey)).toBe(false);
    hunter.y = prey.y + 0.2;
    Object.assign(hunter, { hx: 1, hy: 0 });
    expect(onTail(match, hunter, prey)).toBe(false);
    Object.assign(hunter, { hx: 0, hy: -1 });
    Object.assign(prey, { hx: 0, hy: 1 });
    expect(onTail(match, hunter, prey)).toBe(false);
    Object.assign(prey, { hx: 1, hy: 0 });
    expect(onTail(match, hunter, prey)).toBe(true);
  });

  it("aims across the edge of the sky as well", () => {
    const match = chase();
    const [hunter, prey] = match.crafts;
    Object.assign(prey, { y: 1.35 });
    Object.assign(hunter, { y: 0.1 });
    expect(onTail(match, hunter, prey)).toBe(true);
  });

  it("closes the ring while the hunter stays on the tail, and pops one balloon when it shuts", () => {
    const match = chase();
    const [hunter, prey] = match.crafts;
    const steps = stepsToPop(prey);
    expect(run(match, steps - 1)).toEqual([]);
    expect(prey.lock).toBeCloseTo((steps - 1) * closing(prey), 6);
    expect(hunter.lock).toBe(0);
    const events = run(match, 2);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: "pop", seat: 1, by: 0, left: 2 });
    expect(balloonsOf(match, 1)).toBe(2);
    expect(scoreOf(match, 0)).toBe(1);
    expect(prey).toMatchObject({ lock: 0, lost: 1 });
    expect(prey.safe).toBeGreaterThan(SAFE - 5);
  });

  it("closes the ring sooner on a slower aircraft, soonest on one hanging in the air", () => {
    const fast = { speed: 0.5, pace: 1 };
    const cruising = { speed: 0.4, pace: 1 };
    const hanging = { speed: 0, pace: 1 };
    expect(closing(fast)).toBe(1);
    expect(closing(cruising)).toBeGreaterThan(1.5);
    expect(closing(hanging)).toBeGreaterThan(closing(cruising) * 2);
    expect(closing({ speed: 0.5, pace: 0.8 })).toBeGreaterThan(1);
    expect(LOCK / closing(fast) / 120).toBeGreaterThan(0.8);
    expect(LOCK / closing(hanging) / 120).toBeGreaterThan(0.15);
  });

  it("leaves a just-popped aircraft alone for a moment, so it can get away", () => {
    const match = chase();
    const [, prey] = match.crafts;
    run(match, stepsToPop(prey) + 2);
    run(match, SAFE - 10);
    expect(prey.lost).toBe(1);
    expect(prey.lock).toBe(0);
  });

  it("opens the ring again, twice as fast as it closed, when the hunter loses the tail", () => {
    const match = chase();
    const [hunter, prey] = match.crafts;
    run(match, 30);
    const closed = prey.lock;
    expect(closed).toBeCloseTo(30 * closing(prey), 6);
    Object.assign(hunter, { hx: 1, hy: 0 });
    run(match, 10);
    expect(prey.lock).toBeCloseTo(closed - 20, 6);
    run(match, 30);
    expect(prey.lock).toBe(0);
  });

  it("cannot aim at an aircraft hidden in a cloud", () => {
    const match = chase({ twists: 1 });
    const [hunter, prey] = match.crafts;
    const [cloud] = match.sky.clouds;
    Object.assign(prey, { x: cloud.x, y: cloud.y });
    Object.assign(hunter, { x: cloud.x, y: cloud.y + 0.2 });
    expect(onTail(match, hunter, prey)).toBe(false);
  });

  it("ends when an aircraft has lost its three balloons and has been seen floating away", () => {
    const match = chase();
    const [hunter, prey] = match.crafts;
    prey.lost = 2;
    const events = run(match, stepsToPop(prey) + 1);
    expect(events.at(-1)).toMatchObject({ kind: "pop", seat: 1, left: 0 });
    expect(prey.out).toBeGreaterThan(0);
    expect(match.over).toBe(false);
    expect(onTail(match, hunter, prey)).toBe(false);
    run(match, OUT_SHOW - 5);
    expect(match.over).toBe(false);
    run(match, 10);
    expect(match.over).toBe(true);
    expect([scoreOf(match, 0), scoreOf(match, 1)]).toEqual([3, 0]);
    expect(stepMatch(match, BOTH)).toEqual([]);
  });

  it("ends when the time is up, whatever the balloons", () => {
    const match = createMatch({ seed: "seedAAAA", twists: 0, roundSteps: 50, families: ["plane", "plane"] });
    run(match, 49);
    expect(match.over).toBe(false);
    run(match, 1);
    expect(match.over).toBe(true);
  });

  it("steps and judges only the aircraft this phone owns", () => {
    const match = chase();
    const [hunter, prey] = match.crafts;
    const before = { ...prey };
    run(match, stepsToPop(prey) + 5, [true, false]);
    expect(prey).toEqual(before);
    expect(hunter.y).toBeLessThan(0.8);
    const other = chase();
    run(other, stepsToPop(other.crafts[1]) + 5, [false, true]);
    expect(other.crafts[1].lost).toBe(1);
    expect(other.crafts[0].y).toBe(0.8);
  });

  it("remembers where its own aircraft has just been, a second of it", () => {
    const match = chase();
    const [, prey] = match.crafts;
    const start = { x: prey.x, y: prey.y };
    expect(seenBy(match, 1, 30)).toMatchObject(start);
    run(match, 40, [false, true]);
    expect(seenBy(match, 1, 0)).toMatchObject({ x: prey.x, y: prey.y, hx: prey.hx, hy: prey.hy });
    const before = seenBy(match, 1, 30);
    expect(before.y - prey.y).toBeCloseTo(0.4 * (30 / 120), 2);
    run(match, TRAIL * 2, [false, true]);
    expect(seenBy(match, 1, TRAIL * 5).y - prey.y).toBeCloseTo(0.4 * (TRAIL / 120), 2);
    expect(TRAIL).toBeGreaterThanOrEqual(96);
  });

  it("judges a hunter seen late by where its prey was when the hunter aimed, not where it has flown since", () => {
    const match = chase();
    const [hunter, prey] = match.crafts;
    Object.assign(prey, { x: 0.3, y: 0.6, hx: 1, hy: 0 });
    Object.assign(hunter, { x: 0.3, y: 0.85, hx: 0, hy: -1 });
    const own = [false, true];
    for (let step = 0; step < 60; step += 1) stepMatch(match, own);
    expect(prey.x).toBeGreaterThan(0.45);
    expect(prey.lock).toBe(0);
    stepMatch(match, own, 60);
    expect(prey.lock).toBeGreaterThan(0);
    stepMatch(match, own, 0);
    expect(prey.lock).toBe(0);
  });

  it("never rewinds past a pop: a just-popped aircraft is still left alone", () => {
    const match = chase();
    const [, prey] = match.crafts;
    run(match, stepsToPop(prey) + 1);
    expect(prey.lost).toBe(1);
    for (let step = 0; step < 50; step += 1) stepMatch(match, BOTH, 80);
    expect(prey.lost).toBe(1);
    expect(prey.lock).toBe(0);
  });

  it("puts the other phone's aircraft where it says, and learns its lost balloons only upwards", () => {
    const match = chase();
    placeOther(match, 1, { x: 3.2, y: -1, hx: 1, hy: 0, speed: 0.3, lock: 50, safe: 9, out: 0, boost: 4, rest: 2, bank: 1, down: true, family: "helicopter" });
    expect(match.crafts[1]).toMatchObject({ x: 3.2, y: -1, hx: 1, lock: 50, safe: 9, boost: 4, family: "helicopter", lost: 0 });
    const events = learnLost(match, 1, 2);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: "pop", seat: 1, by: 0, left: 1 });
    expect(match.crafts[1].lost).toBe(2);
    expect(learnLost(match, 1, 1)).toEqual([]);
    expect(learnLost(match, 1, 2.5)).toEqual([]);
    expect(match.crafts[1].lost).toBe(2);
  });
});
