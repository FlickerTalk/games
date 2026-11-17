import { describe, expect, it } from "vitest";
import { bounds, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { drawDashButton, drawPlayBar, drawShells } from "../src/hud.js";
import { barOf } from "../src/layout.js";
import { THEME } from "../src/theme.js";

const strokes = (ctx) => ctx.calls.filter((call) => call.op === "stroke").length;

describe("the score and the controls", () => {
  it("shows three shells a player, the won ones ribbed and the others plain, on a pill of the app's surface", () => {
    const drawn = [0, 1, 2, 3].map((count) => draw((pen) => drawShells(pen, 200, 50, count, THEME, { size: 26 })));
    for (let count = 1; count <= 3; count += 1) expect(strokes(drawn[count])).toBeGreaterThan(strokes(drawn[count - 1]));
    const area = bounds(painted(drawn[3]));
    expect(area.right - area.left).toBeLessThanOrEqual(92);
    expect(area.bottom - area.top).toBeLessThanOrEqual(40);
    expect(shapes(draw((pen) => drawShells(pen, 200, 50, 5, THEME))).join()).toBe(shapes(drawn[3]).join());
    expect(drawn[2].depth).toBe(0);
  });

  it("draws the dash button inside its box, its ring filling as the dash charges, pressed from the moment a finger is on it", () => {
    const box = { x: 100, y: 500, w: 128, h: 128 };
    const idle = draw((pen) => drawDashButton(pen, box, THEME, { toward: [0, -1] }));
    const area = bounds(painted(idle));
    expect(area.left).toBeGreaterThanOrEqual(box.x);
    expect(area.right).toBeLessThanOrEqual(box.x + box.w);
    expect(area.top).toBeGreaterThanOrEqual(box.y);
    expect(area.bottom).toBeLessThanOrEqual(box.y + box.h);
    const arcs = (ctx) => ctx.calls.filter((call) => call.op === "arc").length;
    expect(arcs(draw((pen) => drawDashButton(pen, box, THEME, { toward: [0, -1], charge: 0.5 })))).toBe(arcs(idle) + 1);
    expect(shapes(draw((pen) => drawDashButton(pen, box, THEME, { toward: [0, -1], pressed: true }))).join()).not.toBe(shapes(idle).join());
    expect(shapes(draw((pen) => drawDashButton(pen, box, THEME, { toward: [-1, 0] }))).join()).not.toBe(shapes(idle).join());
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
