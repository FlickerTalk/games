import { describe, expect, it } from "vitest";
import { CLAIM_LETTERS, GONE_V, KINDS, MOST_HITS, REACH, START_V, STEPS_PER_SECOND, decodeClaims, encodeClaims, placeOf, presentAt, scheduleOf, tally } from "../src/fair.js";

const SETTINGS = { rate: 1.3, rise: 0.16, seconds: 55 };
const round = (seed = "AbCdEfGh", settings = SETTINGS) => scheduleOf(seed, settings);
const first = (schedule, kind) => schedule.find((one) => one.kind === kind && one.parent === null);
const midway = (balloon) => balloon.at + 80;
const claim = (balloon, seat, t = midway(balloon)) => ({ id: balloon.id, t, seat });

describe("the balloons of a round", () => {
  it("are the same for the same seed and settings, and others for another seed", () => {
    expect(round()).toEqual(round());
    expect(round("ZZZZZZZZ")).not.toEqual(round());
  });

  it("are numbered in order, start with plain ones, and bring every kind in a long round", () => {
    const schedule = round("AbCdEfGh", { rate: 1.6, rise: 0.2, seconds: 90 });
    schedule.forEach((one, at) => expect(one.id).toBe(at));
    expect(schedule.slice(0, 3).every((one) => ["round", "oval"].includes(one.kind))).toBe(true);
    for (const kind of Object.keys(KINDS)) expect(schedule.some((one) => one.kind === kind), kind).toBe(true);
  });

  it("come about as often as the level says, none in the last two seconds", () => {
    const schedule = round();
    const own = schedule.filter((one) => one.parent === null);
    expect(own.length).toBeGreaterThan(55 * 1.3 * 0.75);
    expect(own.length).toBeLessThan(55 * 1.3 * 1.25);
    expect(Math.max(...own.map((one) => one.at))).toBeLessThanOrEqual((55 - 2) * STEPS_PER_SECOND);
  });

  it("give a star three small ones that wait for it to pop", () => {
    const schedule = round();
    const star = first(schedule, "star");
    const kids = schedule.filter((one) => one.parent === star.id);
    expect(kids.map((one) => one.kind)).toEqual(["small", "small", "small"]);
    expect(kids.map((one) => one.id)).toEqual([star.id + 1, star.id + 2, star.id + 3]);
  });

  it("never need more hits than the claims of one phone can carry, at any level", () => {
    for (const settings of [SETTINGS, { rate: 1.6, rise: 0.2, seconds: 90 }]) {
      const needed = round("QQQQQQQQ", settings).reduce((sum, one) => sum + KINDS[one.kind].need, 0);
      expect(needed).toBeLessThanOrEqual(MOST_HITS);
    }
  });
});

describe("where a balloon is", () => {
  const schedule = round();
  const none = new Map();

  it("is nowhere before it comes, then rises from under the counter to behind the awning, and is gone", () => {
    const balloon = first(schedule, "round");
    expect(placeOf(schedule, balloon, balloon.at - 1, none)).toBeNull();
    expect(placeOf(schedule, balloon, balloon.at, none).v).toBeCloseTo(START_V, 9);
    const life = Math.ceil((START_V - GONE_V) / balloon.rise);
    const seen = [10, 60, life - 2].map((age) => placeOf(schedule, balloon, balloon.at + age, none));
    expect(seen[0].v).toBeGreaterThan(seen[1].v);
    expect(seen[1].v).toBeGreaterThan(seen[2].v);
    for (const place of seen) expect(place.u > 0.05 && place.u < 0.95).toBe(true);
    expect(placeOf(schedule, balloon, balloon.at + life + 1, none)).toBeNull();
  });

  it("is quicker for a small one and slower for a big one", () => {
    expect(first(schedule, "small").rise).toBeGreaterThan(first(schedule, "round").rise);
    expect(first(schedule, "big").rise).toBeLessThan(first(schedule, "round").rise);
  });

  it("puts a star's small ones where the star popped, spreading as they rise", () => {
    const star = first(schedule, "star");
    const kid = schedule[star.id + 1];
    expect(placeOf(schedule, kid, midway(star) + 5, none)).toBeNull();
    const pops = tally(schedule, [claim(star, 0)]).pops;
    const from = placeOf(schedule, star, midway(star), none);
    expect(placeOf(schedule, kid, midway(star), pops)).toMatchObject({ u: from.u, v: from.v });
    const later = placeOf(schedule, kid, midway(star) + 30, pops);
    expect(later.v).toBeLessThan(from.v);
    expect(later.u).not.toBe(from.u);
  });

  it("lists the balloons on show at a moment, without the popped ones", () => {
    const balloon = first(schedule, "round");
    const shown = presentAt(schedule, midway(balloon), none);
    expect(shown.some((one) => one.balloon.id === balloon.id)).toBe(true);
    const pops = tally(schedule, [claim(balloon, 1)]).pops;
    expect(presentAt(schedule, midway(balloon), pops).some((one) => one.balloon.id === balloon.id)).toBe(false);
  });
});

describe("who popped what", () => {
  const schedule = round();

  it("gives a balloon to the earlier claim on the round's clock, and a tie to the first seat", () => {
    const balloon = first(schedule, "round");
    const late = tally(schedule, [claim(balloon, 0, midway(balloon) + 3), claim(balloon, 1, midway(balloon))]);
    expect(late.pops.get(balloon.id)).toEqual({ t: midway(balloon), seat: 1 });
    expect(late.scores).toEqual([0, 1]);
    const tie = tally(schedule, [claim(balloon, 1), claim(balloon, 0)]);
    expect(tie.pops.get(balloon.id).seat).toBe(0);
    expect(tie.scores).toEqual([1, 0]);
  });

  it("counts only a balloon in reach: not one still under the counter nor one already behind the awning", () => {
    const balloon = first(schedule, "round");
    const hidden = Math.ceil((START_V - REACH[0]) / balloon.rise) + 2;
    expect(placeOf(schedule, balloon, balloon.at + hidden, new Map())).not.toBeNull();
    expect(tally(schedule, [claim(balloon, 0, balloon.at + hidden)]).scores).toEqual([0, 0]);
    expect(tally(schedule, [claim(balloon, 0, balloon.at + 1)]).scores).toEqual([0, 0]);
  });

  it("counts two for a small one, and a big one for whoever lands its second hit", () => {
    const small = first(schedule, "small");
    expect(tally(schedule, [claim(small, 0)]).scores).toEqual([2, 0]);
    const big = first(schedule, "big");
    const once = tally(schedule, [claim(big, 0)]);
    expect(once.pops.has(big.id)).toBe(false);
    expect(once.hits.get(big.id)).toBe(1);
    const twice = tally(schedule, [claim(big, 0), claim(big, 1, midway(big) + 9)]);
    expect(twice.pops.get(big.id).seat).toBe(1);
    expect(twice.scores).toEqual([0, 2]);
  });

  it("ignores a cloud, a balloon that is not there yet or any more, and a star's small one before the star popped", () => {
    const cloud = first(schedule, "cloud");
    const balloon = first(schedule, "round");
    const star = first(schedule, "star");
    const kid = schedule[star.id + 1];
    const claims = [claim(cloud, 0), claim(balloon, 0, balloon.at - 5), claim(balloon, 1, balloon.at + 4000), { id: 9999, t: 5, seat: 0 }, claim(kid, 0, midway(star))];
    expect(tally(schedule, claims).scores).toEqual([0, 0]);
    expect(tally(schedule, [claim(star, 1), claim(kid, 0, midway(star) + 10)]).scores).toEqual([2, 1]);
  });
});

describe("a phone's claims on the wire", () => {
  it("are four letters each and read back the same", () => {
    const claims = [{ id: 0, t: 0 }, { id: 63, t: 64 }, { id: 211, t: 3599 }, { id: 4095, t: 4095 }];
    const text = encodeClaims(claims);
    expect(text).toHaveLength(16);
    expect([...text].every((letter) => CLAIM_LETTERS.includes(letter))).toBe(true);
    expect(decodeClaims(text, 1)).toEqual(claims.map((one) => ({ ...one, seat: 1 })));
    expect(decodeClaims("", 0)).toEqual([]);
  });

  it("are refused when they are not that", () => {
    for (const junk of ["abc", "ab!d", 12, null, "A".repeat(4 * MOST_HITS + 4)]) expect(decodeClaims(junk, 0)).toBeNull();
  });
});
