// @vitest-environment node
import { describe, expect, it } from "vitest";
import { FIRST_TO, GOAL_PAUSE, WIDE_STEPS, adoptBall, createMatch, learnLost, mergeRally, reports, scoreOf, stepMatch } from "../src/match.js";
import { TABLE, frontOf } from "../src/table.js";

const BOTH = [true, true];
const make = (fields = {}) => createMatch({ seed: "match001", speed: 0.75, roundSteps: 120 * 60, ...fields });

function play(match, steps, { own = BOTH, aim = [(m) => m.balls[0]?.x ?? 0.5, (m) => m.balls[0]?.x ?? 0.5] } = {}) {
  let now = match;
  const events = [];
  for (let at = 0; at < steps && !now.over; at += 1) {
    now.paddles.forEach((paddle, seat) => (paddle.target = aim[seat](now)));
    const out = stepMatch(now, own);
    now = out.match;
    events.push(...out.events);
  }
  return { match: now, events };
}

describe("a match", () => {
  it("starts with the first rally served, plain, nil all", () => {
    const match = make();
    expect(match.rally).toMatchObject({ k: 0, kind: "none" });
    expect(match.balls).toHaveLength(1);
    expect([scoreOf(match, 0), scoreOf(match, 1)]).toEqual([0, 0]);
    expect(match.over).toBe(false);
  });

  it("never changes the match it is given", () => {
    const match = make();
    const before = JSON.stringify(match);
    stepMatch(match, BOTH);
    expect(JSON.stringify(match)).toBe(before);
  });

  it("keeps a rally going while both paddles follow the ball", () => {
    const { match, events } = play(make(), 120 * 12);
    expect(events.filter((one) => one.kind === "hit").length).toBeGreaterThan(5);
    expect(events.some((one) => one.kind === "goal")).toBe(false);
    expect(match.lost).toEqual([0, 0]);
  });

  it("scores for the other side when a paddle is elsewhere, pauses, then serves the next rally to the side behind", () => {
    const away = (m) => (m.balls[0]?.x > 0.5 ? 0.2 : 0.8);
    const { match, events } = play(make(), 120 * 8, { aim: [(m) => m.balls[0]?.x ?? 0.5, away], own: BOTH });
    const goal = events.find((one) => one.kind === "goal");
    expect(goal).toMatchObject({ seat: 1 });
    expect(scoreOf(match, 0)).toBeGreaterThanOrEqual(1);
    const once = play(make(), 120 * 8, { aim: [(m) => m.balls[0]?.x ?? 0.5, away] });
    expect(once.match.rally.k).toBeGreaterThanOrEqual(1);
    let paused = make();
    for (let at = 0; at < 120 * 8 && paused.lost[1] === 0; at += 1) {
      paused.paddles[0].target = paused.balls[0]?.x ?? 0.5;
      paused.paddles[1].target = away(paused);
      paused = stepMatch(paused, BOTH).match;
    }
    expect(paused.balls).toEqual([]);
    expect(paused.wait).toBe(GOAL_PAUSE);
    const next = play(paused, GOAL_PAUSE + 1, { aim: [() => 0.5, () => 0.5] }).match;
    expect(next.rally.k).toBe(1);
    expect(next.rally.toward).toBe(1);
  });

  it("is over when one side reaches five, or when the round's time runs out", () => {
    const away = (m) => (m.balls[0]?.x > 0.5 ? 0.2 : 0.8);
    const { match } = play(make({ roundSteps: 120 * 400 }), 120 * 300, { aim: [(m) => m.balls[0]?.x ?? 0.5, away] });
    expect(match.over).toBe(true);
    expect(scoreOf(match, 0)).toBe(FIRST_TO);
    const short = play(make({ roundSteps: 300 }), 1000).match;
    expect(short.over).toBe(true);
    expect(short.step).toBe(300);
  });

  it("widens the paddle of the side that sent the ball through the star, for a while", () => {
    let match = make();
    match = { ...match, rally: { ...match.rally, kind: "star", pickup: { look: "star", x: 0.5, y: 0.6, taken: false } }, balls: [{ ...match.balls[0], x: 0.5, y: 0.75, vx: 0, vy: -0.8 }] };
    const { match: after, events } = play(match, 30);
    expect(events.find((one) => one.kind === "pick")).toMatchObject({ seat: 0 });
    expect(after.paddles[0].wide).toBeGreaterThan(WIDE_STEPS - 30);
    expect(after.paddles[1].wide).toBe(0);
  });

  it("learns a goal the other phone decided: the rally ends there and the next one is served after the pause", () => {
    const match = make();
    const { match: after, events } = learnLost(match, 1, 1);
    expect(after.lost).toEqual([0, 1]);
    expect(after.balls).toEqual([]);
    expect(after.wait).toBe(GOAL_PAUSE);
    expect(events).toEqual([expect.objectContaining({ kind: "goal", seat: 1 })]);
    expect(learnLost(after, 1, 1).match).toBe(after);
    expect(learnLost(after, 1, 0).match).toBe(after);
  });

  it("takes the other phone's newer word on a ball, catching up with the time it took to arrive, and ignores an older one", () => {
    const match = make();
    const theirs = { ...match.balls[0], v: 3, by: 1, x: 0.3, y: 0.5, vx: 0.2, vy: 0.7, hits: 3 };
    const { match: after, moved } = adoptBall(match, theirs, 12, [true, false]);
    expect(after.balls[0].v).toBe(3);
    expect(after.balls[0].y).toBeCloseTo(0.5 + 0.7 * 12 / 120, 9);
    expect(moved).toMatchObject({ i: 0 });
    expect(adoptBall(after, { ...theirs, v: 2 }, 0, [true, false]).match).toBe(after);
    expect(adoptBall(after, { ...theirs, k: 4, v: 9 }, 0, [true, false]).match).toBe(after);
  });

  it("adds what the other phone saw popped or taken in the same rally", () => {
    let match = make();
    match = { ...match, rally: { ...match.rally, kind: "bubbles", bubbles: [{ x: 0.2, y: 0.6, r: 0.07, popped: false }, { x: 0.8, y: 0.9, r: 0.07, popped: false }] } };
    const { match: after, events } = mergeRally(match, [0, 2, 0]);
    expect(after.rally.bubbles.map((one) => one.popped)).toEqual([false, true]);
    expect(events).toEqual([expect.objectContaining({ kind: "pop", index: 1 })]);
    expect(mergeRally(after, [3, 1, 1]).match).toBe(after);
  });

  it("tells the other phone only about the balls this phone sent last", () => {
    const match = make();
    expect(reports(match, 0)).toEqual([]);
    const hit = { ...match, balls: [{ ...match.balls[0], v: 1, by: 0 }] };
    expect(reports(hit, 0)).toHaveLength(1);
    expect(reports(hit, 1)).toEqual([]);
  });

  it("holds a ball at the line of a paddle the other phone plays, and never scores there by itself", () => {
    const match = make();
    const towardsThem = { ...match, balls: [{ ...match.balls[0], vy: -0.8, vx: 0 }] };
    const { match: after, events } = play(towardsThem, 120 * 5, { own: [true, false], aim: [() => 0.5, () => 0.9] });
    expect(events.some((one) => one.kind === "goal")).toBe(false);
    expect(after.balls[0].held).toBe(true);
    expect(after.balls[0].y - TABLE.radius).toBeGreaterThanOrEqual(frontOf(1) - 1e-9);
  });
});
