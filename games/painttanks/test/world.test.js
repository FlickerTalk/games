import { describe, expect, it } from "vitest";
import { FIELDS, TARGET_GROUPS, WORLD, familyOf, floorY, groundY, heightsFor, layTargets, seaOf, solidAt, vehicleAt } from "../src/world.js";

const fresh = (field, seed = "AbCdEfGh") => ({ field, seed, heights: heightsFor(field, seed), craters: [], under: [false, false] });

describe("the battlefield", () => {
  it("draws the same hills from the same seed, and other hills from another", () => {
    expect(heightsFor("land", "AbCdEfGh")).toEqual(heightsFor("land", "AbCdEfGh"));
    expect(heightsFor("land", "AbCdEfGh")).not.toEqual(heightsFor("land", "zzzzzzzz"));
    for (const field of FIELDS) {
      const heights = heightsFor(field, "AbCdEfGh");
      expect(heights).toHaveLength(49);
      for (const value of heights) expect(value).toBeGreaterThanOrEqual(0);
    }
  });

  it("puts tanks on land, ships on the sea, a tank against a ship on the coast and a ship against a submarine in the deep sea", () => {
    expect([familyOf("land", 0), familyOf("land", 1)]).toEqual(["tank", "tank"]);
    expect([familyOf("sea", 0), familyOf("sea", 1)]).toEqual(["ship", "ship"]);
    expect([familyOf("coast", 0), familyOf("coast", 1)]).toEqual(["tank", "ship"]);
    expect([familyOf("deep", 0), familyOf("deep", 1)]).toEqual(["ship", "sub"]);
    expect(familyOf("deep", 0, { practice: true })).toBe("sub");
  });

  it("bites a round hole out of the hill where paint lands", () => {
    const world = fresh("land");
    const before = groundY(world, 200);
    const bitten = { ...world, craters: [{ x: 200, y: before, r: 16 }] };
    expect(groundY(bitten, 200)).toBeCloseTo(before + 16, 5);
    expect(groundY(bitten, 230)).toBeCloseTo(groundY(world, 230), 5);
  });

  it("stands a tank on the ground, a ship on the water and a dived submarine deep under it", () => {
    const land = fresh("land");
    const tank = vehicleAt(land, 0);
    expect(tank.x).toBeLessThan(WORLD.width / 2);
    expect(tank.y).toBeCloseTo(groundY(land, tank.x) + tank.size * 0.06, 5);
    const ship = vehicleAt(fresh("sea"), 1);
    expect(ship.x).toBeGreaterThan(WORLD.width / 2);
    expect(ship.y).toBe(seaOf("sea"));
    const deep = fresh("deep");
    const up = vehicleAt(deep, 1);
    const down = vehicleAt({ ...deep, under: [false, true] }, 1);
    expect(down.y).toBeGreaterThan(up.y + 60);
    expect(down.hit.r).toBeLessThan(up.hit.r);
  });

  it("knows what is solid: the hills, the islands of the open sea and the floor of the deep sea", () => {
    const land = fresh("land");
    expect(solidAt(land, 100, groundY(land, 100) + 2)).toBe(true);
    expect(solidAt(land, 100, groundY(land, 100) - 2)).toBe(false);
    const sea = fresh("sea");
    expect(solidAt(sea, WORLD.width * 0.53, seaOf("sea") - 4)).toBe(true);
    expect(solidAt(sea, WORLD.width * 0.2, seaOf("sea") + 40)).toBe(false);
    const deep = fresh("deep");
    expect(solidAt(deep, 200, floorY(200) + 2)).toBe(true);
    expect(solidAt(deep, 200, floorY(200) - 2)).toBe(false);
  });

  it("lays things to shoot at from the field's own kinds, the same for the same seed, apart from each other and inside the world", () => {
    for (const field of FIELDS) {
      const world = fresh(field);
      const battle = layTargets(world, { practice: false });
      const practice = layTargets(world, { practice: true });
      expect(battle).toEqual(layTargets(fresh(field), { practice: false }));
      expect(battle).toHaveLength(4);
      expect(practice).toHaveLength(7);
      const allowed = [...TARGET_GROUPS[field], ...TARGET_GROUPS.helper];
      for (const list of [battle, practice]) {
        expect(list.filter((one) => TARGET_GROUPS.helper.includes(one.kind))).toHaveLength(1);
        for (const one of list) {
          expect(allowed, `${field} ${one.kind}`).toContain(one.kind);
          expect(one.x).toBeGreaterThan(0);
          expect(one.x).toBeLessThan(WORLD.width);
          expect(one.y).toBeGreaterThan(0);
          expect(one.y).toBeLessThan(WORLD.height);
          expect(one.hit).toBe(false);
        }
        list.forEach((one, at) => list.slice(at + 1).forEach((two) => expect(Math.hypot(one.x - two.x, one.y - two.y), `${field} ${one.kind} ${two.kind}`).toBeGreaterThan(30)));
      }
    }
  });
});
