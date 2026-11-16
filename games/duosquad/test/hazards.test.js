import { describe, expect, it } from "vitest";
import { GONE_V, RULES, hazardsAt } from "../src/hazards.js";
import { ENTER, KINDS, scheduleOf, tally } from "../src/waves.js";

const schedule = scheduleOf("AAAAAAAA", { groups: 3, pace: 1, fire: 0.2, tier: 2, seconds: 40 });
const [group] = schedule.groups;
const enemy = group.enemies[0];
const fired = group.latest + enemy.phase;
const none = tally(schedule, []);
const ofEnemy = (hazards) => hazards.filter((one) => one.enemy === enemy.id);

describe("what the enemies throw", () => {
  it("has a rule for each world: slow enough to dodge, and large", () => {
    expect(Object.keys(RULES).sort()).toEqual(["land", "sea", "space"]);
    for (const rule of Object.values(RULES)) {
      expect(rule.speed * 40).toBeLessThanOrEqual(0.3);
      expect(rule.size).toBeGreaterThanOrEqual(0.1);
    }
  });

  it("leaves an enemy when its turn comes, falls, and is gone past the bottom", () => {
    expect(ofEnemy(hazardsAt(schedule, none, fired - 1, RULES.space))).toEqual([]);
    const [first] = ofEnemy(hazardsAt(schedule, none, fired, RULES.space));
    const [later] = ofEnemy(hazardsAt(schedule, none, fired + 40, RULES.space));
    expect(later.key).toBe(first.key);
    expect(later.v).toBeCloseTo(first.v + 40 * RULES.space.speed, 9);
    expect(later.u).toBe(first.u);
    const life = Math.ceil((GONE_V - first.v) / RULES.space.speed);
    expect(ofEnemy(hazardsAt(schedule, none, fired + life + 1, RULES.space)).some((one) => one.key === first.key)).toBe(false);
  });

  it("is thrown again and again by an enemy nobody pops, each with its own key", () => {
    const keys = new Set();
    for (let step = fired; step < fired + enemy.every * 3; step += 5) for (const one of ofEnemy(hazardsAt(schedule, none, step, RULES.space))) keys.add(one.key);
    expect(keys.size).toBeGreaterThanOrEqual(3);
  });

  it("is never thrown by an enemy popped before its turn, and keeps falling when the enemy is popped after", () => {
    const hits = (t) => Array.from({ length: KINDS[enemy.kind].need }, () => ({ id: enemy.id, t, seat: 0 }));
    const before = tally(schedule, hits(group.latest + ENTER));
    expect(ofEnemy(hazardsAt(schedule, before, fired + 10, RULES.space))).toEqual([]);
    const after = tally(schedule, hits(fired + 5));
    expect(ofEnemy(hazardsAt(schedule, after, fired + 10, RULES.space))).toHaveLength(1);
  });

  it("sways in the sea and bounces off the sides in the desert, always inside the field", () => {
    const places = (rule) => Array.from({ length: 30 }, (_, at) => ofEnemy(hazardsAt(schedule, none, fired + at * 4, rule))[0]).filter(Boolean);
    const sea = places(RULES.sea).map((one) => one.u);
    expect(new Set(sea).size).toBeGreaterThan(5);
    const land = places(RULES.land).map((one) => one.u);
    expect(Math.abs(land.at(-1) - land[0])).toBeGreaterThan(0.1);
    for (const rule of Object.values(RULES)) {
      for (let step = fired; step < fired + 600; step += 3) {
        for (const one of hazardsAt(schedule, none, step, rule)) {
          expect(one.u).toBeGreaterThanOrEqual(0.06 - 1e-9);
          expect(one.u).toBeLessThanOrEqual(0.94 + 1e-9);
        }
      }
    }
  });
});
