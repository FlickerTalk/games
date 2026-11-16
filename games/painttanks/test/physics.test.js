import { describe, expect, it } from "vitest";
import { STEP, flyShot, muzzleOf } from "../src/physics.js";
import { DIVED_Y, WORLD, heightsFor, seaOf, vehicleAt } from "../src/world.js";

const worldOf = (field, extra = {}) => ({ field, seed: "AbCdEfGh", heights: heightsFor(field, "AbCdEfGh"), craters: [], under: [false, false], ...extra });
const ball = (angle, power) => ({ kind: "ball", angle, power });

function aimAt(world, side, other, { targets = [] } = {}) {
  for (let power = 10; power <= 99; power += 1) {
    const flight = flyShot(world, side, ball(45, power), { wind: 0, targets });
    if (flight.painted.includes(other)) return { power, flight };
  }
  return null;
}

describe("a paint ball in flight", () => {
  it("flies the same way every time from the same shot, in steps of a fixed length", () => {
    const world = worldOf("land");
    const one = flyShot(world, 0, ball(50, 60), { wind: 0.4, targets: [] });
    const two = flyShot(worldOf("land"), 0, ball(50, 60), { wind: 0.4, targets: [] });
    expect(two).toEqual(one);
    expect(STEP).toBe(1 / 60);
    expect(one.time).toBeCloseTo(one.steps * STEP, 9);
  });

  it("leaves from the end of the barrel, towards the other side", () => {
    const world = worldOf("land");
    const left = muzzleOf(vehicleAt(world, 0), ball(45, 50));
    const right = muzzleOf(vehicleAt(world, 1), ball(45, 50));
    expect(left.x).toBeGreaterThan(vehicleAt(world, 0).x);
    expect(right.x).toBeLessThan(vehicleAt(world, 1).x);
    const flight = flyShot(world, 1, ball(45, 50), { wind: 0, targets: [] });
    expect(flight.path[1][0]).toBeLessThan(flight.path[0][0]);
  });

  it("goes further with more power, and further still with the wind behind it", () => {
    const sea = worldOf("deep");
    const entry = (power, wind) => flyShot(sea, 0, ball(40, power), { wind, targets: [] }).entry?.x ?? Infinity;
    expect(entry(40, 0)).toBeLessThan(entry(60, 0));
    expect(entry(40, -1)).toBeLessThan(entry(40, 0));
    expect(entry(40, 0)).toBeLessThan(entry(40, 1));
  });

  it("paints the other vehicle when it lands on it, and bites the ground where it misses", () => {
    const world = worldOf("land");
    const found = aimAt(world, 0, 1);
    expect(found).not.toBeNull();
    expect(found.flight.painted).toEqual([1]);
    const short = flyShot(world, 0, ball(45, Math.max(5, found.power - 25)), { wind: 0, targets: [] });
    expect(short.painted).toEqual([]);
    expect(short.end.kind).toBe("ground");
    expect(short.crater).toMatchObject({ x: short.end.x, r: 16 });
    const special = flyShot(world, 0, ball(45, Math.max(5, found.power - 25)), { wind: 0, targets: [], special: true });
    expect(special.crater.r).toBeGreaterThan(16);
  });

  it("slows down and sinks once it falls into the water", () => {
    const flight = flyShot(worldOf("deep"), 0, ball(45, 35), { wind: 0, targets: [] });
    expect(flight.entry).not.toBeNull();
    const below = flight.path.filter(([, y]) => y > seaOf("deep") + 4);
    expect(below.length).toBeGreaterThan(3);
    const speeds = below.slice(1).map(([x], at) => Math.abs(x - below[at][0]));
    expect(speeds.at(-1)).toBeLessThan(speeds[0]);
    expect(flight.end.kind).not.toBe("vehicle");
  });

  it("is a straight paint torpedo under water from a dived submarine, which pops at the surface under a ship and paints it", () => {
    const world = worldOf("deep", { under: [false, true] });
    const sub = vehicleAt(world, 1);
    expect(sub.y).toBe(DIVED_Y);
    const flights = Array.from({ length: 41 }, (_, at) => flyShot(world, 1, { kind: "torpedo", angle: at, power: 99 }, { wind: 1, targets: [] }));
    const [first, second, third] = flights[30].path;
    expect((second[1] - first[1]) / (second[0] - first[0])).toBeCloseTo((third[1] - second[1]) / (third[0] - second[0]), 5);
    expect(flights.some((flight) => flight.painted.includes(0))).toBe(true);
    expect(flights[0].end.kind).not.toBe("surface");
  });

  it("paints a thing in its way and stops there, but bounces on to the trampoline", () => {
    const world = worldOf("land");
    const found = aimAt(world, 0, 1);
    const middle = found.flight.path[Math.floor(found.flight.path.length / 2)];
    const box = { kind: "blocks", x: middle[0], y: middle[1], size: 56, hit: false };
    const blocked = flyShot(world, 0, ball(45, found.power), { wind: 0, targets: [box] });
    expect(blocked.struck).toEqual([0]);
    expect(blocked.painted).toEqual([]);
    const spring = { ...box, kind: "trampoline" };
    const bounced = flyShot(world, 0, ball(45, found.power), { wind: 0, targets: [spring] });
    expect(bounced.struck).toEqual([0]);
    expect(bounced.bounced).toBe(true);
    expect(bounced.end.x).not.toBeCloseTo(blocked.end.x, 0);
  });

  it("never takes longer than eight seconds, and stops once out of the world", () => {
    const high = flyShot(worldOf("land"), 0, ball(85, 99), { wind: 0, targets: [] });
    expect(high.time).toBeLessThanOrEqual(8);
    const away = flyShot(worldOf("land"), 1, ball(20, 99), { wind: -1, targets: [] });
    expect(["out", "ground"]).toContain(away.end.kind);
    expect(away.end.x).toBeGreaterThan(-WORLD.width);
  });
});
