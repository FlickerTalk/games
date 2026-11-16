import { describe, expect, it } from "vitest";
import { bounds, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { drawBar } from "../src/bar-art.js";
import { playLayout } from "../src/layout.js";
import { THEME } from "../src/theme.js";
import { paint, texts } from "./screens.js";

const sound = { level: "high", music: true, open: false, volume: 1 };
const shown = (layout, options) => paint((ctx) => drawBar(ctx, layout, { sound, press: null, lang: "en", fill: 0.4, golems: { total: 5, done: 2 }, mate: null, ...options }, THEME, 1));

describe("the bar", () => {
  it("stays in its box with the jar, the round's dots and the pause, speaker and music buttons, at any size and without a word", () => {
    for (const [width, height] of [[384, 801], [360, 343], [1280, 503]]) {
      const layout = playLayout(width, height, {});
      const ctx = shown(layout);
      const box = bounds(painted(ctx));
      expect(box.top).toBeGreaterThanOrEqual(layout.bar.y - 1);
      expect(box.bottom).toBeLessThanOrEqual(layout.bar.y + layout.bar.h + 1);
      expect(box.right).toBeLessThanOrEqual(width);
      expect(texts(ctx)).toEqual([]);
      expect(ctx.depth).toBe(0);
    }
  });

  it("marks one dot for each golem of the round, the done ones differently from those to come", () => {
    const layout = playLayout(384, 801, {});
    const lines = (options) => shapes(shown(layout, options)).join("\n");
    expect(lines({ golems: { total: 8, done: 2 } })).not.toBe(lines({ golems: { total: 5, done: 2 } }));
    const tints = (done) => shown(layout, { golems: { total: 5, done } }).calls.filter((call) => call.op === "set" && call.name === "fillStyle" && call.value === THEME.ui.accent).length;
    expect(tints(4)).toBeGreaterThan(tints(1));
  });

  it("fills the jar as the round goes on", () => {
    const layout = playLayout(384, 801, {});
    expect(shapes(shown(layout, { fill: 0.8 }))).not.toEqual(shapes(shown(layout, { fill: 0.2 })));
  });

  it("puts the teammate's face beside the controls when there is one, thinking on their turn", () => {
    const layout = playLayout(384, 801, { rival: true });
    const flick = { player: { who: "flick" }, thinking: false };
    expect(shapes(shown(layout, { mate: flick })).length).toBeGreaterThan(shapes(shown(layout)).length);
    expect(shapes(shown(layout, { mate: { ...flick, thinking: true } }))).not.toEqual(shapes(shown(layout, { mate: flick })));
  });

  it("unfolds the volume line under the speaker", () => {
    const layout = playLayout(384, 801, {});
    expect(shapes(shown(layout, { sound: { ...sound, open: true } })).length).toBeGreaterThan(shapes(shown(layout)).length);
  });
});
