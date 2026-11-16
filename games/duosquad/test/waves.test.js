import { describe, expect, it } from "vitest";
import { BONUS_STEPS, CLEAR_BONUS, ENTER, KINDS, LULL, MOST_HITS, STEPS_PER_SECOND, decodeClaims, encodeClaims, placeOf, presentAt, scheduleOf, swing, tally } from "../src/waves.js";

const SETTINGS = { groups: 5, pace: 1, fire: 0.1, tier: 3, seconds: 40, boss: false };
const enemiesOf = (schedule) => schedule.groups.flatMap((group) => group.enemies);
const popAll = (schedule, { from = 0, seat = 0, gap = 2 } = {}) => {
  const claims = [];
  let t = from;
  for (const group of schedule.groups) {
    t = Math.max(t + LULL, Math.min(group.latest, t + LULL)) + ENTER;
    for (const enemy of group.enemies) {
      const wanted = enemy.owner ?? seat;
      for (let hit = 0; hit < KINDS[enemy.kind].need; hit += 1) claims.push({ id: enemy.id, t: (t += gap), seat: wanted });
    }
  }
  return claims;
};

describe("the swing every path is made of", () => {
  it("is a wave of one turn between -1 and 1 made without trigonometry", () => {
    expect(swing(0)).toBe(0);
    expect(swing(0.25)).toBe(1);
    expect(swing(0.5)).toBe(0);
    expect(swing(0.75)).toBe(-1);
    expect(swing(3.25)).toBe(1);
    for (let at = 0; at < 200; at += 1) expect(Math.abs(swing(at / 37))).toBeLessThanOrEqual(1);
  });
});

describe("the waves of a round", () => {
  it("are the same for the same seed and differ for another", () => {
    expect(scheduleOf("AAAAAAAA", SETTINGS)).toEqual(scheduleOf("AAAAAAAA", SETTINGS));
    expect(scheduleOf("AAAAAAAA", SETTINGS)).not.toEqual(scheduleOf("BBBBBBBB", SETTINGS));
  });

  it("bring as many groups as the level asks, each later than the one before, the last well before the end", () => {
    const schedule = scheduleOf("AAAAAAAA", SETTINGS);
    expect(schedule.groups).toHaveLength(5);
    expect(schedule.roundSteps).toBe(40 * STEPS_PER_SECOND);
    schedule.groups.forEach((group, at) => {
      expect(group.enemies.length).toBeGreaterThanOrEqual(3);
      if (at) expect(group.latest).toBeGreaterThan(schedule.groups[at - 1].latest);
    });
    expect(schedule.groups.at(-1).latest).toBeLessThanOrEqual(schedule.roundSteps - 6 * STEPS_PER_SECOND);
  });

  it("number the enemies in order and never ask for more hits than two lists of claims can carry", () => {
    for (const seed of ["AAAAAAAA", "BBBBBBBB", "CCCCCCCC"]) {
      const schedule = scheduleOf(seed, { ...SETTINGS, groups: 12, tier: 6, seconds: 90, boss: true });
      const enemies = enemiesOf(schedule);
      enemies.forEach((enemy, at) => expect(enemy.id).toBe(at));
      expect(enemies.reduce((sum, enemy) => sum + KINDS[enemy.kind].need, 0)).toBeLessThanOrEqual(MOST_HITS);
    }
  });

  it("keep the first rounds to the plain kinds and end a boss round on two cores, one for each player", () => {
    const easy = scheduleOf("AAAAAAAA", { ...SETTINGS, tier: 2 });
    expect(new Set(enemiesOf(easy).map((enemy) => enemy.kind))).toEqual(new Set(["scout", "weaver"]));
    const boss = scheduleOf("AAAAAAAA", { ...SETTINGS, boss: true });
    const last = boss.groups.at(-1);
    expect(last.formation).toBe("boss");
    expect(last.enemies.map((enemy) => [enemy.kind, enemy.owner])).toEqual([["core", 0], ["core", 1]]);
  });

  it("move every enemy inside the upper part of the field once it has come in, by whole steps alone", () => {
    const schedule = scheduleOf("CCCCCCCC", { ...SETTINGS, groups: 8, tier: 6, boss: true });
    for (const group of schedule.groups) {
      for (const enemy of group.enemies) {
        expect(placeOf(group, enemy, -1, 1)).toBeNull();
        expect(placeOf(group, enemy, 0, 1).v).toBeLessThan(0);
        for (let age = ENTER; age < 1200; age += 7) {
          const place = placeOf(group, enemy, age, 1.4);
          expect(place.u).toBeGreaterThanOrEqual(0.08);
          expect(place.u).toBeLessThanOrEqual(0.92);
          expect(place.v).toBeGreaterThanOrEqual(0.06);
          expect(place.v).toBeLessThanOrEqual(0.6);
        }
      }
    }
  });
});

describe("the tally of both players' claims", () => {
  const schedule = scheduleOf("AAAAAAAA", SETTINGS);
  const [first, second] = schedule.groups;

  it("starts with the first group on its way and nothing scored", () => {
    const empty = tally(schedule, []);
    expect(empty.scores).toEqual([0, 0]);
    expect(empty.total).toBe(0);
    expect(empty.clearedAt).toBeNull();
    expect(empty.starts[0]).toBe(first.latest);
    expect(presentAt(schedule, empty, first.latest + ENTER).map((one) => one.enemy.id)).toEqual(first.enemies.map((enemy) => enemy.id));
  });

  it("pops an enemy once it has taken the hits it needs, for whoever landed the last one", () => {
    const enemy = first.enemies[0];
    const { need, worth } = KINDS[enemy.kind];
    const t = first.latest + ENTER + 5;
    const claims = Array.from({ length: need }, (_, at) => ({ id: enemy.id, t: t + at, seat: 1 }));
    const after = tally(schedule, claims);
    expect(after.pops.get(enemy.id)).toEqual({ t: t + need - 1, seat: 1 });
    expect(after.scores).toEqual([0, worth]);
    expect(presentAt(schedule, after, t + need).some((one) => one.enemy.id === enemy.id)).toBe(false);
  });

  it("gives an enemy both claim to the earlier step, and a tie to the first seat, whatever order they come in", () => {
    const enemy = first.enemies.find((one) => KINDS[one.kind].need === 1);
    const t = first.latest + ENTER + 9;
    const claims = [{ id: enemy.id, t, seat: 1 }, { id: enemy.id, t, seat: 0 }];
    expect(tally(schedule, claims).pops.get(enemy.id).seat).toBe(0);
    expect(tally(schedule, [...claims].reverse()).pops.get(enemy.id).seat).toBe(0);
    expect(tally(schedule, [{ id: enemy.id, t: t - 1, seat: 1 }, { id: enemy.id, t, seat: 0 }]).pops.get(enemy.id).seat).toBe(1);
  });

  it("ignores a claim on an enemy that has not come yet, is unknown, or is the other player's core", () => {
    const early = { id: second.enemies[0].id, t: second.latest - 10, seat: 0 };
    expect(tally(schedule, [early, { id: 4000, t: 100, seat: 0 }]).hits.size).toBe(0);
    const boss = scheduleOf("AAAAAAAA", { ...SETTINGS, boss: true });
    const core = boss.groups.at(-1).enemies[0];
    const late = boss.groups.at(-1).latest + ENTER;
    expect(tally(boss, [{ id: core.id, t: late, seat: 1 }]).hits.size).toBe(0);
    expect(tally(boss, [{ id: core.id, t: late, seat: 0 }]).hits.get(core.id)).toBe(1);
  });

  it("brings the next group soon after the one before is cleared, and never later than planned", () => {
    const t = first.latest + ENTER;
    const claims = first.enemies.flatMap((enemy) => Array.from({ length: KINDS[enemy.kind].need }, () => ({ id: enemy.id, t, seat: 0 })));
    const after = tally(schedule, claims);
    expect(after.starts[1]).toBe(Math.min(second.latest, t + LULL));
    expect(after.starts[1]).toBeLessThan(second.latest);
    expect(presentAt(schedule, after, after.starts[1] + ENTER).length).toBe(second.enemies.length);
    expect(tally(schedule, []).starts[1]).toBe(second.latest);
  });

  it("clears the round when everything is popped and adds a bonus for the time left to the shared score", () => {
    const claims = popAll(schedule);
    const after = tally(schedule, claims);
    const last = Math.max(...claims.map((claim) => claim.t));
    expect(after.clearedAt).toBe(last);
    expect(after.bonus).toBe(CLEAR_BONUS + Math.floor((schedule.roundSteps - last) / BONUS_STEPS));
    expect(after.total).toBe(after.scores[0] + after.scores[1] + after.bonus);
    expect(tally(schedule, claims.slice(0, -1)).bonus).toBe(0);
  });

  it("comes to the same result from the two lists in either order", () => {
    const claims = popAll(schedule).map((claim, at) => ({ ...claim, seat: at % 2 }));
    const mine = claims.filter((claim) => claim.seat === 0);
    const theirs = claims.filter((claim) => claim.seat === 1);
    expect(tally(schedule, [...mine, ...theirs])).toEqual(tally(schedule, [...theirs, ...mine]));
  });
});

describe("a list of claims on the wire", () => {
  it("is four letters a claim and reads back the same", () => {
    const claims = [{ id: 0, t: 0, seat: 1 }, { id: 149, t: 3599, seat: 1 }, { id: 4095, t: 4095, seat: 1 }];
    const text = encodeClaims(claims);
    expect(text).toHaveLength(12);
    expect(decodeClaims(text, 1)).toEqual(claims);
  });

  it("refuses anything that is not such a list or is longer than a round can hold", () => {
    for (const bad of [null, 7, "abc", "ab!d", "A".repeat(4 * (MOST_HITS + 20) + 4)]) expect(decodeClaims(bad, 0)).toBeNull();
    expect(decodeClaims("", 0)).toEqual([]);
  });
});
