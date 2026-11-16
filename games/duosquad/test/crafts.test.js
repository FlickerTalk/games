import { describe, expect, it } from "vitest";
import { BOLT_SPEED, CAUGHT_MOST, CRAFT_V, FIRE_EVERY, SAFE, TURN, catchCraft, fire, freeCraft, joined, moveCraft, newCraft, stepBolts } from "../src/crafts.js";

const METRICS = { w: 360, h: 600, unit: 360, craft: 72 };
const enemy = (id, u, v, owner = null) => ({ enemy: { id, owner }, u, v, r: 26 });
const flyUntil = (craft, seen, most = 60) => {
  for (let step = 0; step < most; step += 1) {
    const events = stepBolts(craft, seen, METRICS);
    if (events.length) return events;
  }
  return [];
};

describe("a craft", () => {
  it("starts on its own side, steers towards the finger at a steady pace and stays in the field", () => {
    const [left, right] = [newCraft(0), newCraft(1)];
    expect(left.u).toBeLessThan(0.5);
    expect(right.u).toBeGreaterThan(0.5);
    left.want = 0.9;
    moveCraft(left);
    expect(left.u).toBeCloseTo(newCraft(0).u + TURN, 9);
    expect(left.bank).toBe(1);
    for (let step = 0; step < 100; step += 1) moveCraft(left);
    expect(left.u).toBe(0.9);
    expect(left.bank).toBe(0);
    left.want = 7;
    for (let step = 0; step < 100; step += 1) moveCraft(left);
    expect(left.u).toBeLessThanOrEqual(0.94);
  });

  it("fires by itself at a steady beat, and not while it is caught", () => {
    const craft = newCraft(0);
    expect(fire(craft, 10, false)).toBe(true);
    expect(fire(craft, 10 + FIRE_EVERY - 1, false)).toBe(false);
    expect(fire(craft, 10 + FIRE_EVERY, true)).toBe(true);
    expect(craft.bolts.map((bolt) => bolt.wide)).toEqual([false, true]);
    expect(craft.bolts[0].v).toBeLessThan(CRAFT_V);
    craft.caught = 5;
    expect(fire(craft, 500, false)).toBe(false);
  });

  it("sends its bolts straight up until one lands on an enemy or leaves the field", () => {
    const craft = newCraft(0);
    fire(craft, 0, false);
    const before = craft.bolts[0].v;
    expect(stepBolts(craft, [], METRICS)).toEqual([]);
    expect(craft.bolts[0].v).toBeCloseTo(before - BOLT_SPEED, 9);
    expect(flyUntil(craft, [enemy(3, craft.u, 0.3)])).toEqual([{ kind: "hit", id: 3, u: craft.u, v: 0.3 }]);
    expect(craft.bolts).toEqual([]);
    fire(craft, 100, false);
    expect(flyUntil(craft, [enemy(3, craft.u + 0.3, 0.3)])).toEqual([]);
    expect(craft.bolts).toEqual([]);
  });

  it("reaches wider with a joined bolt, and cannot dent the other player's core", () => {
    const off = 40 / METRICS.w;
    const narrow = newCraft(0);
    fire(narrow, 0, false);
    expect(flyUntil(narrow, [enemy(1, narrow.u + off, 0.3)])).toEqual([]);
    const wide = newCraft(0);
    fire(wide, 0, true);
    expect(flyUntil(wide, [enemy(1, wide.u + off, 0.3)])[0]).toMatchObject({ kind: "hit", id: 1 });
    const blocked = newCraft(0);
    fire(blocked, 0, false);
    expect(flyUntil(blocked, [enemy(9, blocked.u, 0.3, 1)])[0]).toMatchObject({ kind: "block", id: 9 });
    expect(blocked.bolts).toEqual([]);
  });

  it("does not hit an enemy that has not come into the field yet", () => {
    const craft = newCraft(0);
    fire(craft, 0, false);
    expect(flyUntil(craft, [enemy(1, craft.u, -0.02)])).toEqual([]);
  });
});

describe("being caught", () => {
  const orb = (u, v) => ({ key: 5, u, v, r: 20 });

  it("happens when something thrown touches the craft: it stops steering and firing", () => {
    const craft = newCraft(0);
    expect(catchCraft(craft, [orb(craft.u + 0.4, CRAFT_V)], METRICS)).toBeNull();
    expect(catchCraft(craft, [orb(craft.u, CRAFT_V - 0.3)], METRICS)).toBeNull();
    expect(catchCraft(craft, [orb(craft.u + 0.02, CRAFT_V)], METRICS)).toBe(5);
    expect(craft.caught).toBe(CAUGHT_MOST);
    const at = craft.u;
    craft.want = 0.9;
    moveCraft(craft);
    expect(craft.u).toBe(at);
    expect(catchCraft(craft, [orb(craft.u, CRAFT_V)], METRICS)).toBeNull();
  });

  it("ends when the teammate touches it, and leaves it safe for a moment", () => {
    const [craft, mate] = [newCraft(0), newCraft(1)];
    catchCraft(craft, [orb(craft.u, CRAFT_V)], METRICS);
    expect(freeCraft(craft, mate, METRICS)).toBe(false);
    mate.u = craft.u + 0.1;
    expect(freeCraft(craft, mate, METRICS)).toBe(true);
    expect(craft).toMatchObject({ caught: 0, safe: SAFE });
    expect(catchCraft(craft, [orb(craft.u, CRAFT_V)], METRICS)).toBeNull();
    for (let step = 0; step < SAFE; step += 1) moveCraft(craft);
    expect(catchCraft(craft, [orb(craft.u, CRAFT_V)], METRICS)).toBe(5);
  });

  it("is not ended by a teammate who is caught too, and wears off by itself", () => {
    const [craft, mate] = [newCraft(0), newCraft(1)];
    mate.u = craft.u;
    craft.caught = CAUGHT_MOST;
    mate.caught = CAUGHT_MOST;
    expect(freeCraft(craft, mate, METRICS)).toBe(false);
    let loose = null;
    for (let step = 0; step < CAUGHT_MOST; step += 1) loose = moveCraft(craft) ?? loose;
    expect(loose).toBe("loose");
    expect(craft).toMatchObject({ caught: 0, safe: SAFE });
  });
});

describe("flying side by side", () => {
  it("joins the two crafts' fire while they are close and both free", () => {
    const [one, two] = [newCraft(0), newCraft(1)];
    expect(joined(one, two, METRICS)).toBe(false);
    two.u = one.u + 0.2;
    expect(joined(one, two, METRICS)).toBe(true);
    two.caught = 3;
    expect(joined(one, two, METRICS)).toBe(false);
  });
});
