import { describe, expect, it } from "vitest";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawDragZone, drawPlayBar, drawScoreLights } from "../src/hud.js";
import { barOf } from "../src/layout.js";
import { THEME } from "../src/theme.js";

const arcs = (ctx) => ctx.calls.filter((call) => call.op === "arc").length;
const polygons = (ctx) => ctx.calls.filter((call) => call.op === "closePath").length;

describe("the score and the controls", () => {
  it("shows five lights a side, the lit ones marked, circles for this side and diamonds for the other", () => {
    for (const score of [0, 2, 5]) {
      const mine = draw((pen) => drawScoreLights(pen, 200, 50, score, THEME.ui, { shape: "circle", size: 18 }));
      expect(arcs(mine)).toBe(5 + score);
      const theirs = draw((pen) => drawScoreLights(pen, 200, 50, score, THEME.ui, { shape: "diamond", size: 18 }));
      expect(polygons(theirs)).toBe(5);
      expect(arcs(theirs)).toBe(score);
    }
    const area = bounds(painted(draw((pen) => drawScoreLights(pen, 200, 50, 3, THEME.ui, { size: 18 }))));
    expect(area.right - area.left).toBeLessThanOrEqual(5 * 18 + 4 * 9 + 2);
  });

  it("draws the drag zone around its centre with its arrows", () => {
    const area = bounds(painted(draw((pen) => drawDragZone(pen, 200, 400, 300, 116, THEME, { active: true }))));
    expect(area.left).toBeGreaterThanOrEqual(50);
    expect(area.right).toBeLessThanOrEqual(350);
    expect(area.top).toBeGreaterThanOrEqual(342);
    expect(area.bottom).toBeLessThanOrEqual(458);
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
