// @vitest-environment node
import { describe, expect, it } from "vitest";
import { BODY, FIRST_TO } from "../src/arena.js";
import { OUT, STUN, press, release } from "../src/body.js";
import { KEPT_PUSHES, createMatch, learnLost, placeOther, scoreOf, stepMatch, takePushes } from "../src/match.js";

const BOTH = [true, true];
const fresh = (variant = "plain") => createMatch({ seed: "match001", variant, roundSteps: 6000 });

function run(match, steps, own = BOTH) {
  const events = [];
  for (let at = 0; at < steps && !match.over; at += 1) events.push(...stepMatch(match, own));
  return events;
}

function charge(match, seat, steps) {
  press(match.bodies[seat]);
  run(match, steps);
  release(match.bodies[seat]);
}

describe("a round on the platform", () => {
  it("starts with both players on, nobody down, and counts its steps", () => {
    const match = fresh();
    expect(match).toMatchObject({ step: 0, over: false, variant: "plain" });
    expect([scoreOf(match, 0), scoreOf(match, 1)]).toEqual([0, 0]);
    run(match, 10);
    expect(match.step).toBe(10);
  });

  it("lets a dashing player shove the one it runs into: the shoved one flies off dizzy, the one who shoved bounces back", () => {
    const match = fresh();
    charge(match, 0, 60);
    const events = run(match, 80);
    const bump = events.find((one) => one.kind === "bump");
    expect(bump).toMatchObject({ by: 0 });
    expect(bump.power).toBeGreaterThan(0.5);
    expect(match.bodies[1].vy).toBeLessThan(-0.2);
    expect(match.bodies[1].stun).toBeGreaterThan(0);
    expect(match.bodies[0].vy).toBeGreaterThanOrEqual(0);
    expect(events.filter((one) => one.kind === "bump")).toHaveLength(1);
  });

  it("drops a shoved player into the water for a point to the other, and ends at three once the splash has been seen", () => {
    const match = fresh();
    for (let point = 1; point <= FIRST_TO; point += 1) {
      Object.assign(match.bodies[1], { vx: 0, vy: -3.2, safe: 0 });
      const events = run(match, OUT + 60);
      expect(events.some((one) => one.kind === "fall" && one.seat === 1)).toBe(true);
      expect(scoreOf(match, 0)).toBe(point);
    }
    expect(match.over).toBe(true);
    expect(match.bodies[1].out).toBeGreaterThan(0);
    expect(scoreOf(match, 1)).toBe(0);
    const step = match.step;
    expect(stepMatch(match, BOTH)).toEqual([]);
    expect(match.step).toBe(step);
  });

  it("ends when the time is up, whatever the score", () => {
    const match = createMatch({ seed: "short", variant: "plain", roundSteps: 50 });
    run(match, 200);
    expect(match).toMatchObject({ over: true, step: 50 });
  });

  it("eases two players apart when they merely lean on each other", () => {
    const match = fresh();
    Object.assign(match.bodies[0], { x: 0, y: 0.1 });
    Object.assign(match.bodies[1], { x: 0, y: -0.1 });
    const events = run(match, 40);
    expect(events).toEqual([]);
    expect(match.bodies[0].y - match.bodies[1].y).toBeGreaterThanOrEqual(2 * BODY - 0.01);
  });

  it("turns its bar and shrinks its platform with the clock", () => {
    const bar = fresh("bar");
    run(bar, 600);
    expect(bar.bar.y).toBeCloseTo(1, 6);
    const shrink = createMatch({ seed: "s", variant: "shrink", roundSteps: 400 });
    Object.assign(shrink.bodies[0], { x: 0, y: 0.8 });
    const events = run(shrink, 399);
    expect(events.some((one) => one.kind === "fall" && one.seat === 0)).toBe(true);
  });
});

describe("a round between two phones, each stepping only its own player", () => {
  it("never moves the other phone's player, and reports a shove instead of applying it", () => {
    const match = fresh();
    const own = [true, false];
    press(match.bodies[0]);
    run(match, 60, own);
    release(match.bodies[0]);
    const events = run(match, 80, own);
    expect(events.filter((one) => one.kind === "bump")).toHaveLength(1);
    expect(match.bodies[1]).toMatchObject({ x: 0, y: -0.45, vx: 0, vy: 0, stun: 0 });
    expect(match.told[0]).toHaveLength(1);
    const [n, jx, jy] = match.told[0][0];
    expect(n).toBe(1);
    expect(jy).toBeLessThan(-0.5);
    expect(Math.abs(jx)).toBeLessThan(0.2);
    expect(match.bodies[0].vy).toBeGreaterThanOrEqual(0);
  });

  it("leaves the shoving to the other phone when its player is the one coming faster", () => {
    const match = fresh();
    placeOther(match, 1, { x: 0, y: 0.1, vx: 0, vy: 2.5, ax: 0, ay: 1, hold: -1, stun: 0, out: 0, safe: 0 });
    const events = run(match, 5, [true, false]);
    expect(events).toEqual([]);
    expect(match.told[0]).toEqual([]);
    expect(match.bodies[0]).toMatchObject({ vx: 0, vy: 0 });
  });

  it("applies each shove the other phone reports to its own player once, in order, and shows it", () => {
    const match = fresh();
    const first = takePushes(match, 0, [[1, 0, 1.5]]);
    expect(first).toEqual([expect.objectContaining({ kind: "bump", by: 1 })]);
    expect(match.bodies[0]).toMatchObject({ vy: 1.5, stun: STUN });
    expect(takePushes(match, 0, [[1, 0, 1.5]])).toEqual([]);
    expect(match.bodies[0].vy).toBe(1.5);
    takePushes(match, 0, [[1, 0, 1.5], [2, 0.5, 0], [3, 0.25, 0]]);
    expect(match.bodies[0]).toMatchObject({ vx: 0.75, vy: 1.5 });
  });

  it("ignores a shove that arrives while its player is in the water, without ever applying it later", () => {
    const match = fresh();
    match.bodies[0].out = 100;
    expect(takePushes(match, 0, [[1, 3, 3]])).toEqual([]);
    match.bodies[0].out = 0;
    expect(takePushes(match, 0, [[1, 3, 3]])).toEqual([]);
    expect(match.bodies[0].vx).toBe(0);
  });

  it("keeps only its last few shoves to tell, numbered without gaps", () => {
    const match = fresh();
    const own = [true, false];
    for (let at = 0; at < KEPT_PUSHES + 3; at += 1) {
      Object.assign(match.bodies[0], { x: 0, y: -0.1, vx: 0, vy: -2, stun: 0 });
      match.hit[0] = 0;
      run(match, 1, own);
    }
    expect(match.told[0]).toHaveLength(KEPT_PUSHES);
    expect(match.told[0].map(([n]) => n)).toEqual([4, 5, 6, 7]);
  });

  it("learns the other player's falls from what it says, as a point for this one", () => {
    const match = fresh();
    expect(learnLost(match, 1, 1)).toEqual([expect.objectContaining({ kind: "point", seat: 0 })]);
    expect(scoreOf(match, 0)).toBe(1);
    expect(learnLost(match, 1, 1)).toEqual([]);
    expect(learnLost(match, 1, 0)).toEqual([]);
    expect(learnLost(match, 1, 2.5)).toEqual([]);
    expect(scoreOf(match, 0)).toBe(1);
  });
});
