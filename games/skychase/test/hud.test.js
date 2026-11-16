import { describe, expect, it } from "vitest";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawPlayBar } from "../src/hud.js";
import { barOf } from "../src/layout.js";
import { THEME } from "../src/theme.js";

describe("the bar", () => {
  it("keeps both faces, the time line and its buttons inside the bar, at any width", () => {
    for (const [width, height] of [[328, 343], [384, 801], [1280, 748]]) {
      const layout = barOf(width, height);
      const state = { lang: "en", press: null, sound: { level: "high", music: true, open: false, volume: 1 }, me: { who: "ari", hair: "none", hairColour: "ink" }, rival: { who: "flick" }, left: 0.4 };
      const ctx = draw((pen) => drawPlayBar(pen, layout, state, THEME, 0));
      const area = bounds(painted(ctx));
      expect(area.left).toBeGreaterThanOrEqual(layout.bar.x - 1);
      expect(area.right).toBeLessThanOrEqual(layout.bar.x + layout.bar.w + 1);
      expect(area.bottom).toBeLessThanOrEqual(layout.bar.y + layout.bar.h + 1);
      expect(ctx.calls.some((call) => call.op === "fillText")).toBe(false);
      expect(ctx.depth).toBe(0);
    }
  });

  it("runs the time line down as the round goes", () => {
    const layout = barOf(384, 801);
    const state = { lang: "en", press: null, sound: { level: "high", music: true, open: false, volume: 1 }, me: { who: "ari" }, rival: { who: "flick" } };
    const full = draw((pen) => drawPlayBar(pen, layout, { ...state, left: 1 }, THEME, 0));
    const empty = draw((pen) => drawPlayBar(pen, layout, { ...state, left: 0 }, THEME, 0));
    expect(full.calls.length).toBeGreaterThan(empty.calls.length);
  });
});
