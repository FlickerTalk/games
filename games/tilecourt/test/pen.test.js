import { describe, expect, it } from "vitest";
import { bounds, draw, painted } from "../../../kit/test/avatars/recorder.js";
import { circle, clamp, ease, line, paint, roundedRect, starPath, wave } from "../src/pen.js";

describe("the pen", () => {
  it("draws a rounded rectangle inside its box, its corners no rounder than half its side", () => {
    const ctx = draw((pen) => roundedRect(pen, 10, 20, 40, 30, 100));
    expect(bounds(painted(ctx))).toEqual({ left: 10, right: 50, top: 20, bottom: 50 });
    expect(ctx.calls.filter((call) => call.op === "arcTo").every((call) => call.radius === 15)).toBe(true);
  });

  it("fills, then outlines only when asked, with the width it is given", () => {
    const ctx = draw((pen) => {
      roundedRect(pen, 0, 0, 10, 10, 2);
      paint(pen, "fill", "edge", 3);
      paint(pen, "fill", null, 3);
    });
    const ops = ctx.calls.filter((call) => ["fill", "stroke"].includes(call.op)).map((call) => call.op);
    expect(ops).toEqual(["fill", "stroke", "fill"]);
    expect(ctx.calls.find((call) => call.name === "lineWidth").value).toBe(3);
  });

  it("draws circles, lines and five-pointed stars where it is told", () => {
    expect(bounds(painted(draw((pen) => circle(pen, 50, 50, 10, "a"))))).toMatchObject({ left: 40, right: 60 });
    const star = draw((pen) => starPath(pen, 0, 0, 10));
    expect(star.calls.filter((call) => call.op === "lineTo")).toHaveLength(9);
    const stroke = draw((pen) => line(pen, [[0, 0], [5, 5]], "a", 2));
    expect(stroke.calls.map((call) => call.op)).toContain("stroke");
  });

  it("keeps numbers within bounds and eases them", () => {
    expect([clamp(-1), clamp(0.5), clamp(2)]).toEqual([0, 0.5, 1]);
    expect([ease(0), ease(1)]).toEqual([0, 1]);
    expect(ease(0.5)).toBeGreaterThan(0.5);
    expect(wave(0)).toBe(0);
    expect(Math.abs(wave(0.25))).toBeCloseTo(1);
  });
});
