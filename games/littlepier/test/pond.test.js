import { describe, expect, it } from "vitest";
import { CREATURES, EDGE, FINDS, MOST_VISITORS, habitatOf, inPond, isFind, visitorAt, visitorsOf } from "../src/pond.js";

const seeds = (count) => Array.from({ length: count }, (_, at) => `pond${String(at).padStart(4, "0")}`);

describe("the water's visitors", () => {
  it("are twenty-four creatures and three funny finds, each creature living in one depth", () => {
    expect(CREATURES).toHaveLength(24);
    expect(new Set(CREATURES).size).toBe(24);
    expect(FINDS).toEqual(["boot", "chest", "bottle"]);
    const habitats = CREATURES.map((_, kind) => habitatOf(kind));
    for (const name of ["shallow", "middle", "floor"]) expect(habitats.filter((one) => one === name)).toHaveLength(8);
  });

  it("come from the round's seed alone, the same on every phone", () => {
    expect(visitorsOf("SameSeed")).toEqual(visitorsOf("SameSeed"));
    expect(visitorsOf("SameSeed")).not.toEqual(visitorsOf("OtherOne"));
    expect(Object.isFrozen(visitorsOf("SameSeed"))).toBe(true);
  });

  it("fill a round of up to ninety seconds with few enough that one letter names each", () => {
    for (const seed of seeds(40)) {
      const list = visitorsOf(seed);
      expect(list.length, seed).toBeLessThanOrEqual(MOST_VISITORS);
      expect(list.length, seed).toBeGreaterThan(30);
      expect(list.map((one) => one.id)).toEqual(list.map((_, at) => at));
      expect(list.filter((one) => isFind(one.kind)).map((one) => one.kind).sort(), seed).toEqual([...FINDS].sort());
      expect(Math.max(...list.map((one) => one.enter)), seed).toBeGreaterThan(85);
    }
  });

  it("are already swimming when a round starts, at their own depth, and cross the water", () => {
    for (const seed of seeds(40)) {
      const list = visitorsOf(seed);
      const swimming = list.filter((one) => inPond(one, 0, 0.08));
      expect(swimming.length, seed).toBeGreaterThanOrEqual(3);
      for (const one of list) {
        expect(one.depth).toBeGreaterThan(0.05);
        expect(one.depth).toBeLessThan(0.97);
        if (!isFind(one.kind)) {
          const band = { shallow: [0.08, 0.4], middle: [0.38, 0.72], floor: [0.8, 0.96] }[habitatOf(one.kind)];
          expect(one.depth).toBeGreaterThanOrEqual(band[0]);
          expect(one.depth).toBeLessThanOrEqual(band[1]);
        }
      }
    }
  });

  it("swim in from one side and out of the other at the round's pace", () => {
    const one = { id: 0, kind: 0, depth: 0.3, speed: 1, direction: 1, enter: 2 };
    expect(visitorAt(one, 2, 0.1).x).toBeCloseTo(-EDGE);
    expect(visitorAt(one, 7, 0.1).x).toBeCloseTo(-EDGE + 0.5);
    expect(visitorAt({ ...one, direction: -1 }, 7, 0.1).x).toBeCloseTo(1 + EDGE - 0.5);
    expect(inPond(one, 1, 0.1)).toBe(false);
    expect(inPond(one, 7, 0.1)).toBe(true);
    expect(inPond(one, 2 + (1 + 2 * EDGE) / 0.1 + 0.1, 0.1)).toBe(false);
    expect(Math.abs(visitorAt(one, 7, 0.1).y - 0.3)).toBeLessThan(0.02);
  });

  it("put the shallow fish in more often than the creatures of the floor", () => {
    const counts = { shallow: 0, middle: 0, floor: 0 };
    for (const seed of seeds(60)) for (const one of visitorsOf(seed)) if (!isFind(one.kind)) counts[habitatOf(one.kind)] += 1;
    expect(counts.shallow).toBeGreaterThan(counts.middle);
    expect(counts.middle).toBeGreaterThan(counts.floor);
    expect(counts.floor).toBeGreaterThan(0);
  });

  it("bring every one of the twenty-four creatures over enough rounds", () => {
    const seen = new Set(seeds(60).flatMap((seed) => visitorsOf(seed).map((one) => one.kind)));
    for (let kind = 0; kind < 24; kind += 1) expect(seen.has(kind), CREATURES[kind]).toBe(true);
  });
});
