import { describe, expect, it } from "vitest";
import { barLayout } from "../../../kit/src/canvas/index.js";
import { bounds, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { drawBar, trainDots } from "../src/bar-art.js";
import { THEME } from "../src/theme.js";

const SOUND = { level: "high", music: true, open: false, volume: 1 };
const bar = (shown = {}, width = 384, height = 801) => {
  const layout = barLayout(width, height, { rival: Boolean(shown.rival) });
  return { layout, ctx: draw((pen) => drawBar(pen, layout, { sound: SOUND, press: null, lang: "en", trains: null, rival: null, ...shown }, THEME, 0)) };
};
const lines = (ctx) => shapes(ctx).join("\n");

describe("the bar over the train", () => {
  it("stays inside its strip, without a word, and leaves the drawing state as it found it", () => {
    for (const [width, height] of [[384, 801], [360, 343], [1280, 748], [844, 338]]) {
      const { layout, ctx } = bar({ trains: { total: 3, at: 1, done: false }, rival: { player: { who: "flick" }, thinking: true } }, width, height);
      const box = bounds(painted(ctx));
      expect(box.top).toBeGreaterThanOrEqual(layout.bar.y - 1);
      expect(box.bottom).toBeLessThanOrEqual(layout.bar.y + layout.bar.h + 1);
      expect(ctx.calls.some((call) => call.op === "fillText")).toBe(false);
      expect(ctx.depth).toBe(0);
    }
  });

  it("shows one dot per train of the round, the ones done filled and the one on the track larger", () => {
    expect(trainDots({ total: 3, at: 1, done: false })).toEqual([{ done: true, here: false }, { done: false, here: true }, { done: false, here: false }]);
    expect(trainDots({ total: 3, at: 2, done: true })).toEqual([{ done: true, here: false }, { done: true, here: false }, { done: true, here: true }]);
    expect(lines(bar({ trains: { total: 3, at: 0, done: false } }).ctx)).not.toBe(lines(bar({ trains: { total: 3, at: 1, done: false } }).ctx));
    expect(lines(bar({ trains: null }).ctx)).not.toBe(lines(bar({ trains: { total: 3, at: 0, done: false } }).ctx));
  });

  it("shows who made or completes the train beside the controls, and the volume line when unfolded", () => {
    const plain = bar().ctx.calls.length;
    expect(bar({ rival: { player: { who: "flick" }, thinking: false } }).ctx.calls.length).toBeGreaterThan(plain);
    const { layout } = bar();
    const open = draw((pen) => drawBar(pen, layout, { sound: { ...SOUND, open: true }, press: null, lang: "en", trains: null, rival: null }, THEME, 0));
    expect(bounds(painted(open)).bottom).toBeGreaterThan(layout.bar.y + layout.bar.h);
  });
});
