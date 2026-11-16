import { describe, expect, it } from "vitest";
import { bounds, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { drawBalloon, drawBurst, drawCloudPuff, drawOwnerMark, drawPop } from "../src/balloons.js";
import { KINDS } from "../src/fair.js";
import { THEME } from "../src/theme.js";

const box = (paint) => {
  const ctx = draw(paint);
  expect(ctx.depth).toBe(0);
  return bounds(painted(ctx));
};
const count = (ctx, op) => ctx.calls.filter((call) => call.op === op).length;

describe("the balloons", () => {
  it("draws each of the six kinds about its size across, its string hanging under it", () => {
    for (const kind of Object.keys(KINDS)) {
      const area = box((pen) => drawBalloon(pen, 200, 200, 80, kind, THEME, { sway: false }));
      const body = kind === "small" ? 1.9 : 1.35;
      expect(area.right - area.left, kind).toBeGreaterThanOrEqual(80 * 0.7);
      expect(area.right - area.left, kind).toBeLessThanOrEqual(80 * body);
      expect(area.top, kind).toBeGreaterThanOrEqual(200 - 80 * 0.7);
      expect(area.bottom, kind).toBeGreaterThan(200 + 80 * 0.6);
      expect(area.bottom, kind).toBeLessThanOrEqual(200 + 80);
    }
  });

  it("tells the kinds apart by their outline, not by colour", () => {
    const outlines = Object.keys(KINDS).map((kind) => shapes(draw((pen) => drawBalloon(pen, 0, 0, 80, kind, THEME, { sway: false }))).join("|"));
    expect(new Set(outlines).size).toBe(6);
  });

  it("sways a little with time and stands still when asked", () => {
    const at = (time) => shapes(draw((pen) => drawBalloon(pen, 100, 100, 70, "round", THEME, { time }))).join("|");
    expect(at(0.3)).not.toBe(at(1.1));
    const still = (time) => shapes(draw((pen) => drawBalloon(pen, 100, 100, 70, "round", THEME, { time, sway: false }))).join("|");
    expect(still(0.3)).toBe(still(1.1));
  });

  it("takes a stitch off the big balloon's patch after its first hit", () => {
    const lines = (hits) => count(draw((pen) => drawBalloon(pen, 0, 0, 100, "big", THEME, { hits, sway: false })), "lineTo");
    expect(lines(1)).toBe(lines(0) - 1);
  });

  it("pops in four frames, the pieces flying further out each time, and nothing once it is over", () => {
    const frame = (progress) => draw((pen) => drawPop(pen, 100, 100, 80, "round", progress, THEME));
    expect(shapes(frame(0.3)).join("|")).toBe(shapes(frame(0.45)).join("|"));
    const widths = [0.3, 0.6, 0.9].map((progress) => bounds(painted(frame(progress)))).map((area) => area.right - area.left);
    expect(widths[1]).toBeGreaterThan(widths[0]);
    expect(widths[2]).toBeGreaterThan(widths[1]);
    expect(count(frame(1), "fill") + count(frame(1), "stroke")).toBe(0);
    expect(frame(0.5).depth).toBe(0);
  });

  it("marks who popped it by shape: a circle for this player, a diamond for the other", () => {
    const mine = draw((pen) => drawOwnerMark(pen, 100, 100, 30, "mine", THEME));
    const theirs = draw((pen) => drawOwnerMark(pen, 100, 100, 30, "theirs", THEME));
    expect(count(mine, "arc")).toBe(1);
    expect(count(theirs, "arc")).toBe(0);
    expect(count(theirs, "lineTo")).toBe(3);
  });

  it("only puffs a cloud, in rings that spread and fade, and scatters confetti from a star", () => {
    const early = box((pen) => drawCloudPuff(pen, 100, 100, 80, 0.2, THEME));
    const late = box((pen) => drawCloudPuff(pen, 100, 100, 80, 0.8, THEME));
    expect(late.right - late.left).toBeGreaterThan(early.right - early.left);
    const asPop = draw((pen) => drawPop(pen, 100, 100, 80, "cloud", 0.5, THEME));
    expect(count(asPop, "arc")).toBe(7);
    const confetti = draw((pen) => drawBurst(pen, 100, 100, 120, 0.5, THEME));
    expect(count(confetti, "fillRect")).toBe(18);
    expect(confetti.depth).toBe(0);
    expect(count(draw((pen) => drawBurst(pen, 100, 100, 120, 1, THEME)), "fillRect")).toBe(0);
  });
});
