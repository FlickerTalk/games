import { describe, expect, it } from "vitest";
import { bounds, draw, painted } from "./recorder.js";
import { circle, clamp, ease, fadeEdges, line, paint, roundedRect, starPath, wave, withRim } from "../../src/canvas/pen.js";

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

describe("a light rim on a dark ground", () => {
  it("is drawn under every outline in the rimmed ink, a little wider, and only while asked", () => {
    const outline = (pen) => {
      roundedRect(pen, 0, 0, 10, 10, 2);
      paint(pen, "fill", "ink", 3);
      paint(pen, "fill", "other", 3);
    };
    const rimmed = draw((pen) => withRim(pen, { ink: "ink", colour: "rim" }, () => outline(pen)));
    const strokes = rimmed.calls.filter((call) => call.op === "set" && call.name === "strokeStyle").map((call) => call.value);
    expect(strokes).toEqual(["rim", "ink", "other"]);
    expect(rimmed.calls.filter((call) => call.name === "lineWidth").map((call) => call.value)).toEqual([6, 3, 3]);
    const plain = draw((pen) => outline(pen));
    expect(plain.calls.filter((call) => call.op === "set" && call.name === "strokeStyle").map((call) => call.value)).toEqual(["ink", "other"]);
  });

  it("does nothing without a colour, and ends even when the drawing throws", () => {
    const ctx = draw((pen) => withRim(pen, { ink: "ink", colour: null }, () => paint(pen, null, "ink", 2)));
    expect(ctx.calls.filter((call) => call.op === "stroke")).toHaveLength(1);
    const pen = draw(() => {});
    expect(() => withRim(pen, { ink: "ink", colour: "rim" }, () => {
      throw new Error("no");
    })).toThrow("no");
    paint(pen, null, "ink", 2);
    expect(pen.calls.filter((call) => call.op === "stroke")).toHaveLength(1);
  });
});

describe("the edges of a stage", () => {
  it("fade into the page in steps at the top and the bottom, inside the frame", () => {
    const ctx = draw((pen) => fadeEdges(pen, 384, 801, "page"));
    const bands = ctx.calls.filter((call) => call.op === "fillRect");
    expect(bands).toHaveLength(6);
    const box = bounds(painted(ctx));
    expect(box).toEqual({ left: 0, right: 384, top: 0, bottom: 801 });
    const alphas = ctx.calls.filter((call) => call.name === "globalAlpha").map((call) => call.value);
    expect(alphas.slice(0, 2)).toEqual([0.72, 0.36]);
    expect(ctx.calls.find((call) => call.name === "fillStyle").value).toBe("page");
    const tallest = Math.max(...bands.map((band) => band.points[1][1] - band.points[0][1]));
    expect(tallest).toBeLessThanOrEqual(38);
    expect(ctx.depth).toBe(0);
  });
});
