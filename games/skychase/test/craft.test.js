import { describe, expect, it } from "vitest";
import { START, STEPS_PER_SECOND, TALL, WIDE, apart, skyOf, wrapped } from "../src/arena.js";
import { FAMILIES, HOVER, createCraft, poseOf, release, steer, stepCraft } from "../src/craft.js";

const CLEAR = skyOf("seedAAAA", 0);

function fly(craft, steps, sky = CLEAR, from = 0) {
  const events = [];
  for (let step = 0; step < steps; step += 1) stepCraft(craft, sky, from + step, events);
  return events;
}

const turnOf = (craft) => Math.atan2(craft.hy, craft.hx);

describe("an aircraft", () => {
  it("starts on its own side with three balloons, already flying", () => {
    const craft = createCraft(1, "plane");
    expect(craft).toMatchObject({ seat: 1, family: "plane", x: START[1].x, y: START[1].y, hx: 0, hy: 1, lost: 0, down: false });
    expect(craft.speed).toBe(FAMILIES.plane.cruise);
  });

  it("never stops: with no finger down a plane flies straight on at its cruising speed", () => {
    const craft = createCraft(0, "plane");
    fly(craft, STEPS_PER_SECOND);
    expect(craft.x).toBeCloseTo(START[0].x);
    expect(START[0].y - craft.y).toBeCloseTo(FAMILIES.plane.cruise, 2);
    expect(Math.hypot(craft.hx, craft.hy)).toBeCloseTo(1, 10);
  });

  it("turns toward the finger while it is down, a little faster, and flies straight on once it is on line", () => {
    const craft = createCraft(0, "plane");
    steer(craft, 0.65, craft.y);
    fly(craft, 10);
    expect(craft.hx).toBeGreaterThan(0.1);
    fly(craft, STEPS_PER_SECOND);
    expect(craft.speed).toBeGreaterThan(FAMILIES.plane.cruise * 1.1);
    expect(Math.hypot(craft.hx, craft.hy)).toBeCloseTo(1, 10);
    const { dx, dy, far } = apart(craft, { x: 0.65, y: START[0].y });
    if (far > 0.05) expect((craft.hx * dx + craft.hy * dy) / far).toBeGreaterThan(0.95);
    release(craft);
    const before = turnOf(craft);
    fly(craft, 60);
    expect(turnOf(craft)).toBe(before);
  });

  it("turns toward where the finger is on the screen, never the short way across the edge", () => {
    const craft = createCraft(0, "plane");
    steer(craft, 0.95, craft.y);
    fly(craft, 20);
    expect(craft.hx).toBeGreaterThan(0);
    const wrappedOnce = createCraft(0, "plane");
    wrappedOnce.x += 3;
    steer(wrappedOnce, 0.05, wrappedOnce.y);
    fly(wrappedOnce, 20);
    expect(wrappedOnce.hx).toBeLessThan(0);
  });

  it("comes back in on the opposite edge: its place on the screen is always inside the sky", () => {
    const craft = createCraft(0, "plane");
    fly(craft, STEPS_PER_SECOND * 6);
    expect(craft.y).toBeLessThan(0);
    expect(wrapped(craft.y, TALL)).toBeGreaterThanOrEqual(0);
    expect(wrapped(craft.y, TALL)).toBeLessThan(TALL);
    expect(wrapped(craft.x, WIDE)).toBeCloseTo(START[0].x);
  });

  it("is slower as a helicopter but turns more sharply, and hangs in the air for a moment when the finger lifts", () => {
    const [plane, copter] = [createCraft(0, "plane"), createCraft(0, "helicopter")];
    expect(FAMILIES.helicopter.fast).toBeLessThan(FAMILIES.plane.fast);
    expect(FAMILIES.helicopter.cruise).toBeLessThan(FAMILIES.plane.cruise);
    for (const craft of [plane, copter]) {
      steer(craft, 0.65, craft.y);
      fly(craft, 20);
    }
    expect(copter.hx).toBeGreaterThan(plane.hx * 1.2);
    release(copter);
    fly(copter, 40);
    expect(copter.speed).toBeLessThan(0.03);
    expect(poseOf(copter)).toBe("hover");
    fly(copter, HOVER + STEPS_PER_SECOND);
    expect(copter.speed).toBeCloseTo(FAMILIES.helicopter.cruise, 2);
    release(plane);
    fly(plane, 40);
    expect(plane.speed).toBeGreaterThan(FAMILIES.plane.cruise * 0.99);
  });

  it("is pushed across by the wind stream while inside it", () => {
    const sky = { ...CLEAR, wind: { y: 0.6, tall: 0.6, push: 0.1 } };
    const craft = createCraft(0, "plane");
    fly(craft, 60, sky);
    expect(craft.x - START[0].x).toBeCloseTo(0.05, 3);
    const outside = createCraft(1, "plane");
    fly(outside, 30, sky);
    expect(outside.x).toBe(START[1].x);
  });

  it("gets a short burst of speed from the rainbow ring, once per pass", () => {
    const sky = { ...CLEAR, ring: { x: START[0].x, y: START[0].y - 0.2, r: 0.1 } };
    const craft = createCraft(0, "plane");
    const events = fly(craft, STEPS_PER_SECOND, sky);
    expect(events.filter((one) => one.kind === "ring")).toHaveLength(1);
    expect(events[0]).toMatchObject({ seat: 0 });
    expect(craft.speed).toBeGreaterThan(FAMILIES.plane.fast);
    expect(poseOf(craft)).toBe("speed");
    fly(craft, STEPS_PER_SECOND * 3, CLEAR);
    expect(craft.speed).toBeCloseTo(FAMILIES.plane.cruise, 2);
  });

  it("cannot fly through the airship: it slides round it", () => {
    const airship = { x: START[0].x + 0.02, y: START[0].y - 0.3, r: 0.12, drift: 0 };
    const sky = { ...CLEAR, airship };
    const craft = createCraft(0, "plane");
    const events = [];
    for (let step = 0; step < STEPS_PER_SECOND * 2; step += 1) {
      stepCraft(craft, sky, step, events);
      expect(apart(airship, craft).far).toBeGreaterThan(airship.r - 1e-6);
    }
    expect(events.some((one) => one.kind === "bonk")).toBe(true);
    expect(events.filter((one) => one.kind === "bonk").length).toBeLessThan(6);
    expect(craft.y).toBeLessThan(airship.y);
  });

  it("floats away slowly once its balloons are gone, steering no more", () => {
    const craft = createCraft(0, "plane");
    craft.out = 1;
    steer(craft, 0.65, craft.y);
    fly(craft, 120);
    expect(craft.out).toBe(121);
    expect(craft.hx).toBe(0);
    expect(craft.speed).toBeLessThan(0.15);
    expect(poseOf(craft)).toBe("losing");
  });

  it("shows what it is doing: hit just after a pop, turning left or right, in a hurry with the finger down", () => {
    const craft = createCraft(0, "plane");
    expect(poseOf(craft)).toBe("idle");
    steer(craft, 0.65, craft.y);
    fly(craft, 5);
    expect(poseOf(craft)).toBe("bankRight");
    steer(craft, 0.05, craft.y - 0.3);
    fly(craft, 5);
    expect(poseOf(craft)).toBe("bankLeft");
    craft.safe = 170;
    craft.hurt = 30;
    expect(poseOf(craft)).toBe("hit");
  });
});
