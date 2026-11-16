import { describe, expect, it } from "vitest";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawPlayBar } from "../src/hud.js";
import { playLayout } from "../src/layout.js";
import { THEME } from "../src/theme.js";

const SOUND = { level: "high", music: true, open: false, volume: 1 };
const texts = (ctx) => ctx.calls.filter((call) => call.op === "fillText");

describe("the bar over the stall", () => {
  it("keeps the scores, the time ribbon and the buttons inside the bar, at any size", () => {
    for (const [width, height] of [[328, 343], [384, 801], [844, 338], [1280, 748]]) {
      const layout = playLayout(width, height, { rival: true });
      const state = { lang: "en", press: null, sound: SOUND, score: 27, rival: { player: { who: "flick" }, score: 14 }, left: 0.4, best: null };
      const ctx = draw((pen) => drawPlayBar(pen, layout, state, THEME, 0));
      const area = bounds(painted(ctx));
      expect(area.left, `${width}`).toBeGreaterThanOrEqual(layout.bar.x - 1);
      expect(area.right, `${width}`).toBeLessThanOrEqual(layout.bar.x + layout.bar.w + 1);
      expect(area.bottom, `${width}`).toBeLessThanOrEqual(layout.bar.y + layout.bar.h + 1);
      expect(ctx.depth).toBe(0);
      expect(texts(ctx).map((call) => call.text)).toEqual(expect.arrayContaining(["27", "14"]));
    }
  });

  it("writes the scores as digits of 20 px or more, and nothing else", () => {
    const layout = playLayout(360, 588, { rival: true });
    const ctx = draw((pen) => drawPlayBar(pen, layout, { lang: "en", press: null, sound: SOUND, score: 3, rival: { player: { who: "flick" }, score: 5 }, left: 1, best: null }, THEME, 0));
    const fonts = ctx.calls.filter((call) => call.op === "set" && call.name === "font").map((call) => Number(/(\d+)px/.exec(call.value)[1]));
    expect(Math.min(...fonts)).toBeGreaterThanOrEqual(20);
    expect(texts(ctx).every((call) => /^\d+$/.test(call.text))).toBe(true);
  });

  it("shrinks the ribbon as the round runs out", () => {
    const layout = playLayout(384, 801, { rival: true });
    const ribbon = (left) => {
      const ctx = draw((pen) => drawPlayBar(pen, layout, { lang: "en", press: null, sound: SOUND, score: 0, rival: null, left, best: null }, THEME, 0));
      return ctx.calls.filter((call) => call.op === "arcTo").length;
    };
    expect(ribbon(0)).toBeLessThan(ribbon(0.5));
  });

  it("shows the player's best mark when playing alone, and no rival", () => {
    const layout = playLayout(384, 801, { rival: false });
    const ctx = draw((pen) => drawPlayBar(pen, layout, { lang: "en", press: null, sound: SOUND, score: 9, rival: null, left: 0.5, best: 31 }, THEME, 0));
    expect(texts(ctx).map((call) => call.text)).toEqual(["9", "31"]);
  });
});
