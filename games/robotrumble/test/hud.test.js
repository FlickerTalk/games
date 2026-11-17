import { describe, expect, it } from "vitest";
import { bounds, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { drawBatteryBar, drawControlButton, drawDial, drawPlayBar, drawRoundLamps, drawShieldBadge } from "../src/hud.js";
import { barOf } from "../src/layout.js";
import { THEME } from "../src/theme.js";

const arcs = (ctx) => ctx.calls.filter((call) => call.op === "arc").length;
const closed = (ctx) => ctx.calls.filter((call) => call.op === "closePath").length;
const fills = (ctx) => ctx.calls.filter((call) => call.op === "fillRect").length;

describe("the score and the controls", () => {
  it("shows three batteries, filled as far as the energy left, mirrored for the robot on the right", () => {
    expect(fills(draw((pen) => drawBatteryBar(pen, 20, 50, 3, THEME)))).toBe(3);
    expect(fills(draw((pen) => drawBatteryBar(pen, 20, 50, 1, THEME)))).toBe(1);
    expect(fills(draw((pen) => drawBatteryBar(pen, 20, 50, 0, THEME)))).toBe(0);
    const left = bounds(painted(draw((pen) => drawBatteryBar(pen, 20, 50, 2, THEME))));
    expect(left.left).toBeGreaterThanOrEqual(19);
    expect(left.right).toBeLessThanOrEqual(20 + 140);
    const right = bounds(painted(draw((pen) => drawBatteryBar(pen, 364, 50, 2, THEME, { direction: -1 }))));
    expect(right.right).toBeLessThanOrEqual(365);
    expect(right.left).toBeGreaterThanOrEqual(364 - 140);
    const small = bounds(painted(draw((pen) => drawBatteryBar(pen, 20, 50, 2, THEME, { scale: 0.5 }))));
    expect(small.right).toBeLessThanOrEqual(20 + 71);
  });

  it("shows three lamps a side, the lit ones marked, circles for this side and diamonds for the other", () => {
    for (const wins of [0, 2, 3]) {
      expect(arcs(draw((pen) => drawRoundLamps(pen, 30, 30, wins, THEME))), `${wins}`).toBe(3 + wins);
      const theirs = draw((pen) => drawRoundLamps(pen, 350, 30, wins, THEME, { direction: -1, shape: "diamond" }));
      expect(closed(theirs), `${wins}`).toBe(3);
      expect(arcs(theirs), `${wins}`).toBe(wins);
    }
  });

  it("draws the glove's and the boot's buttons inside their targets, lit once chosen", () => {
    const target = { x: 10, y: 600, w: 120, h: 120 };
    for (const kind of ["glove", "boot"]) {
      const ctx = draw((pen) => drawControlButton(pen, target, kind, THEME));
      const area = bounds(painted(ctx));
      expect(area.left, kind).toBeGreaterThanOrEqual(10);
      expect(area.right, kind).toBeLessThanOrEqual(130);
      expect(area.top, kind).toBeGreaterThanOrEqual(600);
      expect(area.bottom, kind).toBeLessThanOrEqual(720);
      expect(ctx.depth, kind).toBe(0);
      const lit = draw((pen) => drawControlButton(pen, target, kind, THEME, { lit: true }));
      expect(lit.calls.length, kind).toBeGreaterThan(ctx.calls.length);
    }
    expect(shapes(draw((pen) => drawControlButton(pen, target, "glove", THEME)))).not.toEqual(shapes(draw((pen) => drawControlButton(pen, target, "boot", THEME))));
  });

  it("drains the dial through the window and marks it with a wind-up key 24 px or more", () => {
    const sweep = (share) => draw((pen) => drawDial(pen, 180, 100, 22, share, THEME)).calls.filter((call) => call.op === "arc" && call.to - call.from < 6.28).map((call) => call.to - call.from);
    expect(sweep(1)[0]).toBeGreaterThan(sweep(0.25)[0]);
    expect(sweep(0)).toEqual([]);
    const area = bounds(painted(draw((pen) => drawDial(pen, 180, 100, 22, 0.5, THEME))));
    expect(area.right - area.left).toBeLessThanOrEqual(46);
    expect(area.right - area.left).toBeGreaterThanOrEqual(36);
  });

  it("draws the shield's badge around its centre", () => {
    const area = bounds(painted(draw((pen) => drawShieldBadge(pen, 100, 100, 36, THEME))));
    expect(area.left).toBeGreaterThanOrEqual(80);
    expect(area.right).toBeLessThanOrEqual(120);
  });

  it("keeps the bar's faces, time and buttons inside the bar, at any width", () => {
    for (const [width, height] of [[328, 343], [384, 801], [1280, 748]]) {
      const layout = barOf(width, height);
      const state = { lang: "en", press: null, sound: { level: "high", music: true, open: false, volume: 1 }, me: { who: "ari", hair: "none", hairColour: "ink" }, rival: { who: "flick" }, left: 0.4 };
      const ctx = draw((pen) => drawPlayBar(pen, layout, state, THEME, 0));
      const area = bounds(painted(ctx));
      expect(area.left).toBeGreaterThanOrEqual(layout.bar.x - 1);
      expect(area.right).toBeLessThanOrEqual(layout.bar.x + layout.bar.w + 1);
      expect(area.bottom).toBeLessThanOrEqual(layout.bar.y + layout.bar.h + 1);
      expect(ctx.depth).toBe(0);
    }
  });

  it("puts the rival's face beside the sound button when the bar has no pause", () => {
    const layout = barOf(384, 801, { pause: false });
    const state = { lang: "en", press: null, sound: { level: "high", music: true, open: false, volume: 1 }, me: { who: "ari", hair: "none", hairColour: "ink" }, rival: { who: "flick" }, left: 0.4 };
    const ctx = draw((pen) => drawPlayBar(pen, layout, state, THEME, 0));
    const faces = ctx.calls.filter((call) => call.op === "arc" && Math.abs(call.radius - (layout.row - 12) * 0.48) < 0.01);
    expect(Math.max(...faces.map((call) => call.points[0][0]))).toBeCloseTo(layout.controls.speaker.x - 6 - (layout.row - 12) / 2, 5);
    expect(bounds(painted(ctx)).right).toBeLessThanOrEqual(layout.bar.x + layout.bar.w + 1);
  });
});
