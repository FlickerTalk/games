import { describe, expect, it } from "vitest";
import { inPond, visitorAt, visitorsOf } from "../src/pond.js";
import { HOOK_X, LOWER, RAISE, SLIP_SECONDS, catchesOf, resumeRound, roundSnapshot, startRound, stepRound } from "../src/round.js";

const REACH = Object.freeze({ w: 384, h: 560, radius: 26 });

function run(round, seconds, holding, step = 1 / 60) {
  let now = round;
  const events = [];
  for (let spent = 0; spent < seconds - 1e-9 && !now.over; spent += step) {
    const done = stepRound(now, step, { holding, reach: REACH });
    now = done.round;
    events.push(...done.events);
  }
  return { round: now, events };
}

function lone(visitor) {
  const round = startRound({ seed: "LoneFish", seconds: 60, pace: 0.1 });
  return { ...round, visitors: [visitor] };
}

const meeting = (visitor, pace, x) => visitor.enter + Math.abs(x - visitorAt(visitor, visitor.enter, pace).x) / (visitor.speed * pace);

describe("a hook in the water", () => {
  it("goes down while the finger holds and comes up when it lets go, never past the surface or the floor", () => {
    const round = { ...startRound({ seed: "EmptyOne", seconds: 60, pace: 0.1 }), visitors: [] };
    let { round: now } = run(round, 1, [true]);
    expect(now.hooks[0].y).toBeCloseTo(LOWER, 1);
    now = run(now, 5, [true]).round;
    expect(now.hooks[0].y).toBe(1);
    now = run(now, 0.5, [false]).round;
    expect(now.hooks[0].y).toBeCloseTo(1 - RAISE * 0.5, 1);
    now = run(now, 3, [false]).round;
    expect(now.hooks[0].y).toBe(0);
    expect(now.hooks[0].x).toBe(HOOK_X[0]);
  });

  it("lets a fish that touches it bite, and lands it when it comes up, once", () => {
    const fish = { id: 0, kind: 0, depth: 0.3, speed: 1, direction: 1, enter: 0 };
    const at = meeting(fish, 0.1, HOOK_X[0]);
    const lowered = run(lone(fish), at - 0.3, [false]).round;
    const { round: bitten, events } = run(lowered, 0.3 + 0.3 / LOWER + 0.4, [true]);
    expect(events).toContainEqual({ kind: "bite", hook: 0, id: 0 });
    expect(bitten.hooks[0].fish).toBe(0);
    const { round: landed, events: after } = run(bitten, 2, [false]);
    expect(after).toContainEqual({ kind: "catch", hook: 0, id: 0 });
    expect(after.filter((one) => one.kind === "catch")).toHaveLength(1);
    expect(landed.caught).toEqual([[0]]);
    expect(landed.hooks[0].fish).toBeNull();
    expect(catchesOf(landed)).toBe(1);
    expect(run(landed, 3, [true]).events.filter((one) => one.kind === "bite")).toEqual([]);
  });

  it("lets the fish slip away, swimming off, when the finger holds on too long after the bite", () => {
    const fish = { id: 0, kind: 1, depth: 0.25, speed: 1, direction: -1, enter: 0 };
    const at = meeting(fish, 0.1, HOOK_X[0]);
    const near = run(lone(fish), at - 0.6, [false]).round;
    const { round: bitten } = run(near, 0.6 + 0.25 / LOWER + 0.3, [true]);
    expect(bitten.hooks[0].fish).toBe(0);
    const { round: slipped, events } = run(bitten, SLIP_SECONDS + 0.2, [true]);
    expect(events).toContainEqual({ kind: "slip", hook: 0, id: 0 });
    expect(slipped.hooks[0].fish).toBeNull();
    expect(slipped.fled.map((one) => one.id)).toEqual([0]);
    const after = run(slipped, 4, [false]);
    expect(after.events.some((one) => one.kind === "bite" || one.kind === "catch")).toBe(false);
    expect(catchesOf(after.round)).toBe(0);
  });

  it("is not missed by a fish crossing it between two slow frames", () => {
    const fish = { id: 0, kind: 4, depth: 0.97, speed: 1.2, direction: 1, enter: 0 };
    const at = meeting(fish, 0.12, HOOK_X[0]);
    const round = { ...startRound({ seed: "SlowFrames", seconds: 60, pace: 0.12 }), visitors: [fish] };
    const down = run(round, at - 1, [true]).round;
    expect(down.hooks[0].y).toBe(1);
    expect(down.hooks[0].fish).toBeNull();
    const { events } = stepRound(down, 1.5, { holding: [true], reach: REACH });
    expect(events).toContainEqual({ kind: "bite", hook: 0, id: 0 });
  });

  it("never changes the round it is given", () => {
    const round = startRound({ seed: "Untouched", seconds: 40, pace: 0.1, anglers: 2 });
    const copy = JSON.parse(JSON.stringify(round));
    stepRound(round, 0.5, { holding: [true, true], reach: REACH });
    expect(round).toEqual(copy);
  });
});

describe("a round", () => {
  it("ends at its length, and a fish still on a hook counts as caught", () => {
    const fish = { id: 0, kind: 2, depth: 0.2, speed: 1, direction: 1, enter: 0 };
    const at = meeting(fish, 0.1, HOOK_X[0]);
    const round = { ...startRound({ seed: "EndsHere", seconds: at + 0.6, pace: 0.1 }), visitors: [fish] };
    const near = run(round, at - 0.6, [false]).round;
    const { round: done, events } = run(near, 3, [true]);
    expect(done.over).toBe(true);
    expect(events.at(-1)).toEqual({ kind: "end" });
    expect(events).toContainEqual({ kind: "catch", hook: 0, id: 0 });
    expect(done.time).toBeCloseTo(at + 0.6, 5);
    expect(stepRound(done, 1, { holding: [true], reach: REACH }).events).toEqual([]);
  });

  it("gives Flick its own hook further along the pier, and keeps who caught what", () => {
    const round = startRound({ seed: "TwoHooks", seconds: 35, pace: 0.08, anglers: 2 });
    expect(round.hooks.map((hook) => hook.x)).toEqual([...HOOK_X]);
    expect(round.caught).toEqual([[], []]);
  });

  it("plays the seed's own visitors, and only those still in the water bite", () => {
    const round = startRound({ seed: "RealPond", seconds: 90, pace: 0.08 });
    const visitors = visitorsOf("RealPond");
    let now = round;
    const bites = [];
    for (let step = 0; step < 90 * 20 && !now.over; step += 1) {
      const done = stepRound(now, 0.05, { holding: [Math.floor(now.time / 1.5) % 2 === 0], reach: REACH });
      for (const event of done.events.filter((one) => one.kind === "bite")) {
        expect(inPond(visitors[event.id], done.round.time, 0.08), `${event.id}`).toBe(true);
        bites.push(event.id);
      }
      now = done.round;
    }
    expect(new Set(bites).size).toBe(bites.length);
    expect(catchesOf(now)).toBeGreaterThan(0);
  });

  it("is kept as a small snapshot and goes on from it, the hooks back at the surface", () => {
    const fish = { id: 0, kind: 0, depth: 0.3, speed: 1, direction: 1, enter: 0 };
    const at = meeting(fish, 0.1, HOOK_X[0]);
    const played = run(run(lone(fish), at - 0.3, [false]).round, 1.5, [true]).round;
    const landed = run(played, 2, [false]).round;
    const kept = JSON.parse(JSON.stringify(roundSnapshot(landed)));
    expect(Object.keys(kept).sort()).toEqual(["caught", "fled", "pace", "seconds", "seed", "time"]);
    const again = resumeRound(kept, { anglers: 1 });
    expect(again.time).toBeCloseTo(landed.time);
    expect(again.caught).toEqual([[0]]);
    expect(again.hooks[0]).toEqual({ x: HOOK_X[0], y: 0, fish: null, held: 0 });
    expect(resumeRound({ seed: 3 }, { anglers: 1 })).toBeNull();
  });
});
