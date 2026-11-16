import { describe, expect, it } from "vitest";
import { START, TALL, TWISTS, WIDE, apart, gap, hidden, shipAt, skyOf, wrapped } from "../src/arena.js";

describe("the sky", () => {
  it("brings anything that leaves one edge back in on the opposite one", () => {
    expect(wrapped(1.25, WIDE)).toBeCloseTo(0.25);
    expect(wrapped(-0.1, WIDE)).toBeCloseTo(0.9);
    expect(wrapped(-3.2, TALL)).toBeCloseTo(1);
    expect(wrapped(0.4, TALL)).toBe(0.4);
  });

  it("measures the short way round between two points", () => {
    expect(gap(0.9, 0.1, WIDE)).toBeCloseTo(0.2);
    expect(gap(0.1, 0.9, WIDE)).toBeCloseTo(-0.2);
    expect(gap(3.9, -1.9, WIDE)).toBeCloseTo(0.2);
    const { dx, dy, far } = apart({ x: 0.95, y: 0.1 }, { x: 0.05, y: 1.3 });
    expect(dx).toBeCloseTo(0.1);
    expect(dy).toBeCloseTo(-0.2);
    expect(far).toBeCloseTo(Math.hypot(0.1, 0.2));
  });

  it("starts the two aircraft far apart, flying opposite ways, neither behind the other", () => {
    const [near, far] = START;
    expect(apart(near, far).far).toBeGreaterThan(0.5);
    expect(near.hx * far.hx + near.hy * far.hy).toBe(-1);
  });

  it("has more in it with each twist: clouds, then wind, then a rainbow ring, then an airship", () => {
    expect(TWISTS).toEqual(["clear", "clouds", "wind", "ring", "airship"]);
    const count = (sky) => [sky.clouds.length > 0, Boolean(sky.wind), Boolean(sky.ring), Boolean(sky.airship)].filter(Boolean).length;
    for (let twists = 0; twists < TWISTS.length; twists += 1) expect(count(skyOf("seedAAAA", twists))).toBe(twists);
    expect(count(skyOf("seedAAAA", 9))).toBe(4);
  });

  it("builds the same sky from the same seed, inside the arena and clear of where the aircraft start", () => {
    for (const seed of ["seedAAAA", "seedBBBB", "x", "another"]) {
      const sky = skyOf(seed, 4);
      expect(skyOf(seed, 4)).toEqual(sky);
      expect(sky.clouds.length).toBeGreaterThanOrEqual(2);
      for (const thing of [...sky.clouds, sky.ring, sky.airship]) {
        expect(thing.x).toBeGreaterThanOrEqual(0);
        expect(thing.x).toBeLessThan(WIDE);
        expect(thing.y).toBeGreaterThanOrEqual(0);
        expect(thing.y).toBeLessThan(TALL);
        for (const start of START) expect(apart(start, thing).far, seed).toBeGreaterThan(thing.r);
      }
      expect(Math.abs(sky.wind.push)).toBeGreaterThan(0.05);
    }
    expect(skyOf("seedAAAA", 4)).not.toEqual(skyOf("seedBBBB", 4));
  });

  it("hides an aircraft well inside a cloud, and nowhere else", () => {
    const sky = skyOf("seedAAAA", 1);
    const [cloud] = sky.clouds;
    expect(hidden(sky, cloud)).toBe(true);
    expect(hidden(sky, { x: cloud.x + WIDE, y: cloud.y - TALL })).toBe(true);
    expect(hidden(sky, { x: cloud.x + cloud.r * 1.05, y: cloud.y })).toBe(false);
    expect(hidden(skyOf("seedAAAA", 0), cloud)).toBe(false);
  });

  it("drifts the airship slowly across, the same for the same step", () => {
    const { airship } = skyOf("seedAAAA", 4);
    const later = shipAt(airship, 1200);
    expect(later.y).toBe(airship.y);
    expect(Math.abs(gap(airship.x, later.x, WIDE))).toBeGreaterThan(0.1);
    expect(Math.abs(gap(airship.x, later.x, WIDE))).toBeLessThan(0.5);
    expect(shipAt(airship, 1200)).toEqual(later);
  });
});
