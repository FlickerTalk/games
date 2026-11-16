import { describe, expect, it } from "vitest";
import { bounds, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { TOOLS } from "../src/levels.js";
import { THEME } from "../src/theme.js";
import { drawAimLine, drawArrow, drawCork, drawGauge, drawMissPuff, drawSplash, drawToy } from "../src/toys.js";

const box = (paint) => {
  const ctx = draw(paint);
  expect(ctx.depth).toBe(0);
  return bounds(painted(ctx));
};
const count = (ctx, op) => ctx.calls.filter((call) => call.op === op).length;
const outline = (paint) => shapes(draw(paint)).join("|");

describe("the toys", () => {
  it("draws each of the three within its size, each with its own outline", () => {
    for (const tool of TOOLS) {
      const area = box((pen) => drawToy(pen, tool, 200, 200, 120, THEME));
      expect(area.right - area.left, tool).toBeLessThanOrEqual(120 * 1.15);
      expect(area.bottom - area.top, tool).toBeLessThanOrEqual(120 * 1.25);
      expect(area.right - area.left, tool).toBeGreaterThanOrEqual(120 * 0.4);
    }
    expect(new Set(TOOLS.map((tool) => outline((pen) => drawToy(pen, tool, 0, 0, 120, THEME)))).size).toBe(3);
  });

  it("kicks back when fired, shows the blaster's tank filling and the bow's string pulled", () => {
    const rest = outline((pen) => drawToy(pen, "popgun", 0, 0, 120, THEME));
    expect(outline((pen) => drawToy(pen, "popgun", 0, 0, 120, THEME, { firing: 0.5 }))).not.toBe(rest);
    const tank = (fill) => outline((pen) => drawToy(pen, "blaster", 0, 0, 120, THEME, { tank: fill }));
    expect(tank(0.2)).not.toBe(tank(1));
    const bow = (pull) => outline((pen) => drawToy(pen, "bow", 0, 0, 120, THEME, { pull }));
    expect(bow(0.8)).not.toBe(bow(0));
    const empty = draw((pen) => drawToy(pen, "bow", 0, 0, 120, THEME, { arrow: false }));
    expect(empty.calls.length).toBeLessThan(draw((pen) => drawToy(pen, "bow", 0, 0, 120, THEME)).calls.length);
  });

  it("turns the bow towards where it aims", () => {
    const up = box((pen) => drawToy(pen, "bow", 200, 200, 120, THEME, { angle: -Math.PI / 2 }));
    const left = box((pen) => drawToy(pen, "bow", 200, 200, 120, THEME, { angle: -Math.PI / 2 - 0.8 }));
    expect(left.left).toBeLessThan(up.left);
  });

  it("draws the cork, the arrow with its suction cup, and the dotted aim line reaching its length", () => {
    const cork = box((pen) => drawCork(pen, 100, 100, 26, 0, THEME));
    expect(cork.right - cork.left).toBeLessThanOrEqual(30);
    const arrow = box((pen) => drawArrow(pen, 100, 100, 90, -Math.PI / 2, THEME));
    expect(arrow.bottom - arrow.top).toBeGreaterThan(80);
    expect(arrow.right - arrow.left).toBeLessThan(40);
    const aim = draw((pen) => drawAimLine(pen, 100, 400, 210, -Math.PI / 2, 0.5, THEME));
    expect(count(aim, "arc")).toBe(7);
    const reach = bounds(painted(aim));
    expect(reach.top).toBeLessThan(400 - 205);
    expect(reach.bottom).toBeLessThan(400);
  });

  it("spreads the splash to its radius, fading, and puffs a miss", () => {
    const early = box((pen) => drawSplash(pen, 200, 200, 100, 0.1, THEME));
    const late = box((pen) => drawSplash(pen, 200, 200, 100, 0.9, THEME));
    expect(late.right - late.left).toBeGreaterThan(early.right - early.left);
    expect(late.right - late.left).toBeLessThanOrEqual(100 * 2.4);
    const puff = draw((pen) => drawMissPuff(pen, 100, 100, 54, 0.5, THEME));
    expect(count(puff, "arc")).toBe(4);
    expect(count(draw((pen) => drawMissPuff(pen, 100, 100, 54, 1, THEME)), "arc")).toBe(0);
  });

  it("fills a gauge from empty to full in the app's colours", () => {
    const wide = (share) => {
      const rects = draw((pen) => drawGauge(pen, 100, 100, 80, share, THEME.ui)).calls.filter((call) => call.op === "arcTo");
      return rects.length;
    };
    expect(wide(0)).toBe(4);
    expect(wide(0.5)).toBe(8);
  });
});
