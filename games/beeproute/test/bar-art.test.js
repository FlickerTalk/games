import { describe, expect, it } from "vitest";
import { bounds, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { drawBar, levelDots } from "../src/bar-art.js";
import { playLayout } from "../src/layout.js";
import { THEME } from "../src/theme.js";
import { paint } from "./screens.js";

const sound = { level: "high", music: true, open: false, volume: 1 };
const shown = (layout, options) => paint((ctx) => drawBar(ctx, layout, { sound, press: null, lang: "en", level: 3, batteries: { total: 0, got: 0 }, rival: null, ...options }, THEME, 1));

describe("the bar", () => {
  it("stays in its box with the pause, speaker and music buttons, at any size", () => {
    for (const [width, height] of [[384, 801], [360, 343], [1280, 503]]) {
      const layout = playLayout(width, height, {});
      const box = bounds(painted(shown(layout)));
      expect(box.top).toBeGreaterThanOrEqual(layout.bar.y - 1);
      expect(box.bottom).toBeLessThanOrEqual(layout.bar.y + layout.bar.h + 1);
      expect(box.right).toBeLessThanOrEqual(width);
    }
  });

  it("shows the batteries still to collect, lit as the robot takes them", () => {
    const layout = playLayout(384, 801, {});
    const none = shapes(shown(layout));
    const three = shapes(shown(layout, { batteries: { total: 3, got: 0 } }));
    expect(three.length).toBeGreaterThan(none.length);
    const lit = shown(layout, { batteries: { total: 3, got: 0b101 } });
    const alphas = (ctx) => ctx.calls.filter((call) => call.op === "set" && call.name === "globalAlpha" && call.value < 1).length;
    expect(alphas(lit)).toBeLessThan(alphas(shown(layout, { batteries: { total: 3, got: 0 } })));
  });

  it("marks the level on a path of five dots, the next group starting after the fifth", () => {
    expect(levelDots(1)).toEqual({ current: 0, count: 5 });
    expect(levelDots(5)).toEqual({ current: 4, count: 5 });
    expect(levelDots(6)).toEqual({ current: 0, count: 5 });
  });

  it("puts the rival's face beside the controls when there is one", () => {
    const layout = playLayout(384, 801, { rival: true });
    expect(shapes(shown(layout, { rival: { player: { who: "flick" } } })).length).toBeGreaterThan(shapes(shown(layout)).length);
  });
});
