// @vitest-environment node
import { describe, expect, it } from "vitest";
import { FLOAT, START } from "../src/arena.js";
import { CHARGE_STEPS, COOL, DASH, FALL_SHOW, OUT, SAFE, STUN, chargeOf, createBody, poseOf, press, pushBody, release, speedOf, stepBody } from "../src/body.js";

const PLAIN = { variant: "plain", radius: 1, bar: { x: 1, y: 0 } };

function run(body, steps, arena = PLAIN) {
  const events = [];
  for (let at = 0; at < steps; at += 1) stepBody(body, arena, events);
  return events;
}

describe("one player on the platform", () => {
  it("starts on its own side, still, its arrow pointing at the middle and turning one way, a full turn in three seconds", () => {
    const body = createBody(0);
    expect([body.x, body.y]).toEqual(START[0]);
    expect([body.ax, body.ay]).toEqual([0, -1]);
    expect(createBody(1).ay).toBe(1);
    run(body, 90);
    expect(body.ax).toBeCloseTo(1, 6);
    run(body, 270);
    expect(body.ay).toBeCloseTo(-1, 6);
    expect([body.x, body.y]).toEqual(START[0]);
  });

  it("dashes where the arrow points on a tap, gently, and slides to a stop on the platform", () => {
    const body = createBody(0);
    press(body);
    release(body);
    const events = run(body, 2);
    expect(events).toEqual([expect.objectContaining({ kind: "dash", seat: 0, power: 0 })]);
    expect(speedOf(body)).toBeCloseTo(DASH.least, 1);
    expect(body.vy).toBeLessThan(0);
    run(body, 600);
    expect(speedOf(body)).toBe(0);
    expect(START[0][1] - body.y).toBeGreaterThan(0.3);
    expect(START[0][1] - body.y).toBeLessThan(0.6);
  });

  it("holds its arrow still while the finger is down, squashing as it charges, and dashes harder the longer it was held", () => {
    const body = createBody(0);
    press(body);
    run(body, CHARGE_STEPS / 2 + 1);
    expect([body.ax, body.ay]).toEqual([0, -1]);
    expect(chargeOf(body)).toBeCloseTo(0.5, 1);
    expect(poseOf(body)).toBe("charging");
    run(body, CHARGE_STEPS * 2);
    expect(chargeOf(body)).toBe(1);
    release(body);
    const [dash] = run(body, 1);
    expect(dash).toMatchObject({ kind: "dash", power: 1 });
    expect(speedOf(body)).toBeGreaterThan(DASH.most * 0.98);
    expect(poseOf(body)).toBe("dash");
  });

  it("waits a moment after a dash before it charges again, then does so if the finger is still down", () => {
    const body = createBody(0);
    press(body);
    release(body);
    run(body, 2);
    press(body);
    run(body, COOL - 4);
    expect(body.hold).toBe(-1);
    run(body, 8);
    expect(body.hold).toBeGreaterThanOrEqual(0);
  });

  it("falls into the water once its feet pass the edge, counts it, floats a while near the platform and climbs back to its start, safe for a moment", () => {
    const body = createBody(0);
    body.vy = 3;
    const events = run(body, 60);
    expect(events).toEqual([expect.objectContaining({ kind: "fall", seat: 0 })]);
    expect(body).toMatchObject({ lost: 1, hold: -1 });
    expect(body.out).toBeGreaterThan(0);
    expect(poseOf(body)).toBe("falling");
    run(body, FALL_SHOW);
    expect(Math.hypot(body.x, body.y)).toBeLessThanOrEqual(FLOAT + 1e-9);
    expect(poseOf(body)).toBe("swim");
    const back = run(body, OUT);
    expect(back).toEqual([expect.objectContaining({ kind: "back", seat: 0 })]);
    expect([body.x, body.y, body.vx, body.vy]).toEqual([...START[0], 0, 0]);
    expect(body.safe).toBeGreaterThan(0);
    expect(poseOf(body)).toBe("back");
    run(body, SAFE);
    expect(poseOf(body)).toBe("idle");
  });

  it("is shoved by a push, dizzy for a moment and unable to charge, unless it is in the water or just back", () => {
    const body = createBody(0);
    press(body);
    run(body, 10);
    expect(pushBody(body, 1.5, 0)).toBe(true);
    expect(body).toMatchObject({ vx: 1.5, hold: -1, stun: STUN });
    expect(poseOf(body)).toBe("bumped");
    run(body, STUN - 2);
    expect(body.hold).toBe(-1);
    run(body, 6);
    expect(body.hold).toBeGreaterThanOrEqual(0);
    const wet = createBody(1);
    wet.out = 50;
    expect(pushBody(wet, 2, 2)).toBe(false);
    const fresh = createBody(1);
    fresh.safe = 10;
    expect(pushBody(fresh, 2, 2)).toBe(false);
    expect(fresh.vx).toBe(0);
  });

  it("slides much further over the icy patch", () => {
    const [dry, icy] = [createBody(0), createBody(0)];
    for (const body of [dry, icy]) Object.assign(body, { x: -0.1, y: 0.1, vx: 0.6, vy: 0 });
    run(dry, 240);
    run(icy, 240, { ...PLAIN, variant: "ice" });
    expect(icy.x - dry.x).toBeGreaterThan(0.2);
  });

  it("is bounced out of the trampoline in the middle, and swept along by the turning bar", () => {
    const body = createBody(0);
    Object.assign(body, { x: 0.36, y: 0, vx: -0.8, vy: 0 });
    const events = run(body, 12, { ...PLAIN, variant: "trampoline" });
    expect(events.some((one) => one.kind === "boing")).toBe(true);
    expect(body.vx).toBeGreaterThan(0.5);
    const swept = createBody(0);
    Object.assign(swept, { x: 0.5, y: 0.17, vx: 0, vy: -0.4 });
    const hits = run(swept, 20, { ...PLAIN, variant: "bar" });
    expect(hits.some((one) => one.kind === "bar")).toBe(true);
    expect(swept.vy).toBeGreaterThan(0.1);
    expect(swept.y).toBeGreaterThanOrEqual(0.15);
  });
});
