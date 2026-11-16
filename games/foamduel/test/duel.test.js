// @vitest-environment node
import { describe, expect, it } from "vitest";
import { FAKES, FLOOR_MS, MOST_EXCHANGES, STEPS_PER_SECOND, STEP_MS, WINDOW_MS, decodeClaims, encodeClaims, exchangeAt, judge, scheduleOf, standing, tally } from "../src/duel.js";

const SETTINGS = { fakes: 0, seconds: 35 };
const seconds = (steps) => steps / STEPS_PER_SECOND;

describe("the exchanges of a round", () => {
  it("are the same for the same seed and different for another, so two phones build the same round without sending it", () => {
    expect(scheduleOf("AAAAAAAA", SETTINGS)).toEqual(scheduleOf("AAAAAAAA", SETTINGS));
    expect(scheduleOf("AAAAAAAA", SETTINGS)).not.toEqual(scheduleOf("BBBBBBBB", SETTINGS));
  });

  it("follow one another and fill the round: swords up, a wait nobody can guess, the bell, a second to answer, a rest", () => {
    for (const seed of ["one", "two", "three", "four"]) {
      for (const length of [35, 60, 90]) {
        const schedule = scheduleOf(seed, { fakes: 0.8, seconds: length });
        expect(schedule.length, seed).toBeGreaterThanOrEqual(Math.floor(length / 7));
        expect(schedule.length, seed).toBeLessThanOrEqual(MOST_EXCHANGES);
        schedule.forEach((one, at) => {
          expect(one.x).toBe(at);
          expect(seconds(one.signal - one.ready), seed).toBeGreaterThanOrEqual(1.2);
          expect(seconds(one.signal - one.ready), seed).toBeLessThanOrEqual(7.5);
          expect((one.close - one.signal) * STEP_MS).toBe(WINDOW_MS);
          expect(one.end).toBeGreaterThan(one.close);
          if (at > 0) expect(one.ready).toBeGreaterThanOrEqual(schedule[at - 1].end);
        });
        expect(schedule.at(-1).end).toBeLessThanOrEqual(length * STEPS_PER_SECOND);
        expect(seconds(length * STEPS_PER_SECOND - schedule.at(-1).end), seed).toBeLessThan(0.7);
        const waits = new Set(schedule.map((one) => one.signal - one.ready));
        expect(waits.size, seed).toBeGreaterThan(schedule.length / 2);
      }
    }
  });

  it("show no lure at the first level and more of them later, each a shape that is not the bell, well before it", () => {
    expect(scheduleOf("lures", { fakes: 0, seconds: 90 }).flatMap((one) => one.fakes)).toEqual([]);
    const some = scheduleOf("lures", { fakes: 0.5, seconds: 90 }).flatMap((one) => one.fakes).length;
    const many = scheduleOf("lures", { fakes: 1.5, seconds: 90 });
    expect(many.flatMap((one) => one.fakes).length).toBeGreaterThan(some);
    expect(some).toBeGreaterThan(0);
    for (const one of many) {
      expect(one.fakes.length).toBeLessThanOrEqual(2);
      one.fakes.forEach((fake, at) => {
        expect(FAKES).toContain(fake.kind);
        expect(seconds(fake.at - one.ready)).toBeGreaterThanOrEqual(0.5);
        expect(seconds(one.signal - fake.at)).toBeGreaterThanOrEqual(0.7);
        if (at > 0) expect(seconds(fake.at - one.fakes[at - 1].at)).toBeGreaterThanOrEqual(0.7);
      });
    }
  });

  it("finds the exchange a moment of the round belongs to", () => {
    const schedule = scheduleOf("where", SETTINGS);
    expect(exchangeAt(schedule, 0)).toBeNull();
    expect(exchangeAt(schedule, schedule[1].ready)).toBe(schedule[1]);
    expect(exchangeAt(schedule, schedule[1].end - 1)).toBe(schedule[1]);
    expect(exchangeAt(schedule, schedule.at(-1).end)).toBeNull();
  });
});

describe("who wins an exchange", () => {
  const early = { r: 0 };
  const at = (r) => ({ r });

  it("is whoever reacted in less time, each measured on their own phone", () => {
    expect(judge(at(310), at(420))).toEqual({ win: [true, false], early: [false, false] });
    expect(judge(at(520), at(420))).toEqual({ win: [false, true], early: [false, false] });
    expect(judge(at(300), null)).toEqual({ win: [true, false], early: [false, false] });
    expect(judge(null, null)).toEqual({ win: [false, false], early: [false, false] });
  });

  it("pops both balloons on the very same time", () => {
    expect(judge(at(333), at(333)).win).toEqual([true, true]);
  });

  it("gives the exchange to the other when one taps before the bell, and to nobody when both do", () => {
    expect(judge(early, null)).toEqual({ win: [false, true], early: [true, false] });
    expect(judge(early, at(900))).toEqual({ win: [false, true], early: [true, false] });
    expect(judge(early, early)).toEqual({ win: [false, false], early: [true, true] });
  });

  it("takes a time under the floor for a tap before the bell: nobody reacts that fast", () => {
    expect(FLOOR_MS).toBeGreaterThanOrEqual(100);
    expect(judge(at(FLOOR_MS - 1), at(400))).toEqual({ win: [false, true], early: [true, false] });
    expect(judge(at(1), null).early).toEqual([true, false]);
    expect(judge(at(FLOOR_MS), at(400)).win).toEqual([true, false]);
  });
});

describe("the score of a round", () => {
  const schedule = scheduleOf("score", SETTINGS);

  it("is read from both players' reports, one a seat for each exchange, the same whatever order they come in", () => {
    const claims = [{ x: 0, r: 300, seat: 0 }, { x: 0, r: 280, seat: 1 }, { x: 1, r: 0, seat: 1 }, { x: 2, r: 410, seat: 0 }, { x: 2, r: 999, seat: 0 }, { x: 3, r: 500, seat: 1 }, { x: 3, r: 500, seat: 0 }];
    const read = tally(schedule, claims);
    expect(read.scores).toEqual([3, 2]);
    expect(read.results.get(1)).toEqual({ win: [true, false], early: [false, true], r: [null, 0] });
    expect(read.results.get(2).r).toEqual([410, null]);
    expect(tally(schedule, [...claims].reverse()).scores).toEqual([3, 2]);
    expect(tally(schedule, []).scores).toEqual([0, 0]);
  });

  it("ignores a report about an exchange the round does not have", () => {
    expect(tally(schedule, [{ x: schedule.length, r: 300, seat: 0 }]).scores).toEqual([0, 0]);
  });
});

describe("what a phone shows of an exchange before it has both reports", () => {
  const friend = { slack: 80 };

  it("is open while nobody tapped, and stays open to this player while the other's time is still to beat", () => {
    expect(standing({ mine: null, theirs: null, myElapsed: 200, theirElapsed: 200, ...friend }).state).toBe("open");
    expect(standing({ mine: null, theirs: { r: 400 }, myElapsed: 300, theirElapsed: 500, ...friend }).state).toBe("open");
    expect(standing({ mine: null, theirs: { r: 400 }, myElapsed: 401, theirElapsed: 500, ...friend })).toMatchObject({ state: "done", win: [false, true] });
  });

  it("waits for the other phone's clock to pass this player's time before giving them the balloon", () => {
    expect(standing({ mine: { r: 300 }, theirs: null, myElapsed: 320, theirElapsed: 250, ...friend }).state).toBe("pending");
    expect(standing({ mine: { r: 300 }, theirs: null, myElapsed: 420, theirElapsed: 379, ...friend }).state).toBe("pending");
    expect(standing({ mine: { r: 300 }, theirs: null, myElapsed: 420, theirElapsed: 380, ...friend })).toMatchObject({ state: "done", win: [true, false] });
  });

  it("needs no waiting when both players are on this phone", () => {
    expect(standing({ mine: { r: 300 }, theirs: null, myElapsed: 300, theirElapsed: 300, slack: 0 })).toMatchObject({ state: "done", win: [true, false] });
  });

  it("is settled at once by both reports, by a tap before the bell, or when the exchange is over", () => {
    expect(standing({ mine: { r: 300 }, theirs: { r: 250 }, myElapsed: 300, theirElapsed: 0, ...friend })).toMatchObject({ state: "done", win: [false, true] });
    expect(standing({ mine: { r: 0 }, theirs: null, myElapsed: -1, theirElapsed: -1, ...friend })).toMatchObject({ state: "done", win: [false, true], early: [true, false] });
    expect(standing({ mine: null, theirs: { r: 0 }, myElapsed: -1, theirElapsed: -1, ...friend })).toMatchObject({ state: "done", win: [true, false], early: [false, true] });
    expect(standing({ mine: { r: 300 }, theirs: null, myElapsed: 2000, theirElapsed: 0, over: true, ...friend })).toMatchObject({ state: "done", win: [true, false] });
    expect(standing({ mine: null, theirs: null, myElapsed: 2000, theirElapsed: 0, over: true, ...friend })).toMatchObject({ state: "done", win: [false, false] });
  });
});

describe("a player's reports on the wire", () => {
  it("are three letters each and read back as they were written", () => {
    const claims = [{ x: 0, r: 0 }, { x: 3, r: 287 }, { x: MOST_EXCHANGES - 1, r: WINDOW_MS }];
    const text = encodeClaims(claims);
    expect(text).toHaveLength(9);
    expect(decodeClaims(text, 1)).toEqual(claims.map((one) => ({ ...one, seat: 1 })));
    expect(decodeClaims("", 0)).toEqual([]);
  });

  it("are refused when malformed, out of range, repeated or out of order", () => {
    const text = (claims) => encodeClaims(claims);
    for (const bad of [null, 5, "AB", "A!A", text([{ x: 2, r: 100 }, { x: 2, r: 200 }]), text([{ x: 3, r: 100 }, { x: 1, r: 200 }]), text([{ x: 0, r: WINDOW_MS + 1 }]), text([{ x: MOST_EXCHANGES, r: 5 }]), "AAA".repeat(MOST_EXCHANGES + 1)]) {
      expect(decodeClaims(bad, 0), String(bad)).toBeNull();
    }
  });
});
