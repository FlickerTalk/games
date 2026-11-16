import { describe, expect, it } from "vitest";
import { clinksOf, golemOf, handOf, replayRound, startRound, strike, turnOf, usefulNow } from "../src/round.js";

const SOLO = { hands: [[2, 5, 10]], golems: [{ number: 30, cap: null }, { number: 20, cap: 10 }] };
const TEAM = { hands: [[2, 4], [3, 5]], golems: [{ number: 12, cap: null }, { number: 10, cap: null }, { number: 42, cap: null }] };

function play(round, hits) {
  const events = [];
  let now = round;
  for (const [side, divisor] of hits) {
    const done = strike(now, side, divisor);
    events.push(done.event);
    now = done.round;
  }
  return { round: now, events };
}

describe("a round alone", () => {
  it("starts on the first golem, whole, with the player to hit", () => {
    const round = startRound(SOLO);
    expect(round).toMatchObject({ at: 0, value: 30, count: 1, over: false, clinks: [0] });
    expect(golemOf(round)).toEqual({ number: 30, cap: null });
    expect(turnOf(round)).toBe(0);
    expect(usefulNow(round, 0)).toEqual([2, 5, 10]);
  });

  it("splits every golem standing into as many as the divisor, each carrying the quotient", () => {
    const { round, events } = play(startRound(SOLO), [[0, 2], [0, 5]]);
    expect(events[0]).toEqual({ kind: "split", side: 0, divisor: 2, golem: 0, from: { value: 30, count: 1 }, to: { value: 15, count: 2 }, done: false, over: false });
    expect(events[1]).toMatchObject({ kind: "split", from: { value: 15, count: 2 }, to: { value: 3, count: 10 }, done: true, over: false });
    expect(round).toMatchObject({ at: 1, value: 20, count: 1 });
  });

  it("lets a divisor that does not divide bounce off: nothing changes but the count of clinks", () => {
    const { round, events } = play(startRound(SOLO), [[0, 2], [0, 10]]);
    expect(events[1]).toEqual({ kind: "clink", side: 0, divisor: 10, golem: 0, capped: false });
    expect(round).toMatchObject({ at: 0, value: 15, count: 2, clinks: [1] });
    expect(clinksOf(round)).toBe(1);
  });

  it("bounces the capped divisor off too, and ends the round after the last golem", () => {
    const { round, events } = play(startRound(SOLO), [[0, 10], [0, 10], [0, 2], [0, 2], [0, 5]]);
    expect(events[1]).toMatchObject({ kind: "clink", capped: true });
    expect(events[4]).toMatchObject({ kind: "split", to: { value: 1, count: 20 }, done: true, over: true });
    expect(round.over).toBe(true);
    expect(turnOf(round)).toBeNull();
    expect(strike(round, 0, 2)).toEqual({ round, event: null });
  });

  it("takes no hit with a divisor the player does not hold", () => {
    const round = startRound(SOLO);
    expect(strike(round, 0, 3).event).toBeNull();
    expect(strike(round, 1, 2).event).toBeNull();
  });
});

describe("a round as a team", () => {
  it("gives each player their own hand", () => {
    const round = startRound(TEAM);
    expect(handOf(round, 0)).toEqual([2, 4]);
    expect(handOf(round, 1)).toEqual([3, 5]);
    expect(round.clinks).toEqual([0, 0]);
  });

  it("passes the turn to whoever holds a divisor that fits, and takes turns when both do", () => {
    let round = startRound(TEAM);
    expect(turnOf(round)).toBe(0);
    expect(strike(round, 1, 3).event).toBeNull();
    round = strike(round, 0, 2).round;
    expect(round).toMatchObject({ value: 6, count: 2 });
    expect(turnOf(round)).toBe(1);
    round = strike(round, 1, 3).round;
    expect(turnOf(round)).toBe(0);
    round = strike(round, 0, 2).round;
    expect(round).toMatchObject({ at: 1, value: 10 });
  });

  it("lets the other player open every second golem when both could", () => {
    const { round } = play(startRound(TEAM), [[0, 4], [1, 3]]);
    expect(round).toMatchObject({ at: 1, value: 10 });
    expect(turnOf(round)).toBe(1);
  });

  it("keeps the turn after a clink and counts it for the player who made it", () => {
    const { round, events } = play(startRound(TEAM), [[0, 2], [1, 5]]);
    expect(events[1]).toMatchObject({ kind: "clink", side: 1 });
    expect(round.clinks).toEqual([0, 1]);
    expect(turnOf(round)).toBe(1);
  });
});

describe("a round replayed from its hits", () => {
  it("ends where the hits lead, and stops at the first hit that is not allowed", () => {
    expect(replayRound(TEAM, [[0, 2], [1, 3], [0, 2]])).toMatchObject({ at: 1, value: 10 });
    expect(replayRound(TEAM, [[0, 2], [0, 2]])).toBeNull();
  });
});
