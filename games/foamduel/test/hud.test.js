import { describe, expect, it } from "vitest";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawPad, drawPlayBar } from "../src/hud.js";
import { playLayout } from "../src/layout.js";
import { THEME } from "../src/theme.js";

const SOUND = { level: "high", music: true, open: false, volume: 1 };
const texts = (ctx) => ctx.calls.filter((call) => call.op === "fillText");
const state = (more = {}) => ({ lang: "en", press: null, sound: SOUND, score: 4, rival: { player: { who: "flick" }, score: 2 }, left: 0.4, ...more });

describe("the bar over the duel", () => {
  it("keeps the scores, the time ribbon and the buttons inside the bar, at any size", () => {
    for (const [width, height] of [[328, 343], [384, 801], [844, 338], [1280, 748]]) {
      const layout = playLayout(width, height);
      const ctx = draw((pen) => drawPlayBar(pen, layout, state(), THEME, 0));
      const area = bounds(painted(ctx));
      expect(area.left, `${width}`).toBeGreaterThanOrEqual(layout.bar.x - 1);
      expect(area.right, `${width}`).toBeLessThanOrEqual(layout.bar.x + layout.bar.w + 1);
      expect(area.bottom, `${width}`).toBeLessThanOrEqual(layout.bar.y + layout.bar.h + 1);
      expect(ctx.depth).toBe(0);
      expect(texts(ctx).map((call) => call.text)).toEqual(expect.arrayContaining(["4", "2"]));
    }
  });

  it("writes the scores as digits of 20 px or more, and nothing else", () => {
    const layout = playLayout(360, 588);
    const ctx = draw((pen) => drawPlayBar(pen, layout, state(), THEME, 0));
    const fonts = ctx.calls.filter((call) => call.op === "set" && call.name === "font").map((call) => Number(/(\d+)px/.exec(call.value)[1]));
    expect(Math.min(...fonts)).toBeGreaterThanOrEqual(20);
    expect(texts(ctx).every((call) => /^\d+$/.test(call.text))).toBe(true);
  });

  it("shrinks the ribbon as the round runs out", () => {
    const layout = playLayout(384, 801);
    const ribbon = (left) => draw((pen) => drawPlayBar(pen, layout, state({ left }), THEME, 0)).calls.filter((call) => call.op === "arcTo").length;
    expect(ribbon(0)).toBeLessThan(ribbon(0.5));
  });
});

describe("a pad to strike with", () => {
  it("is a circle for the first player and a rounded square for the second, each with a foam sword on it, inside its box", () => {
    const pad = { x: 40, y: 60, w: 136, h: 136 };
    const first = draw((pen) => drawPad(pen, pad, 0, THEME, { sword: "broad" }));
    const second = draw((pen) => drawPad(pen, pad, 1, THEME, { sword: "curved" }));
    expect(first.calls.some((call) => call.op === "arc" && Math.abs(call.radius - 68) < 8)).toBe(true);
    expect(second.calls.some((call) => call.op === "arc" && Math.abs(call.radius - 68) < 8)).toBe(false);
    for (const ctx of [first, second]) {
      const area = bounds(painted(ctx));
      expect(ctx.depth).toBe(0);
      expect(area.left).toBeGreaterThanOrEqual(pad.x - 2);
      expect(area.right).toBeLessThanOrEqual(pad.x + pad.w + 2);
      expect(area.top).toBeGreaterThanOrEqual(pad.y - 2);
      expect(area.bottom).toBeLessThanOrEqual(pad.y + pad.h + 2);
      expect(ctx.calls.length).toBeGreaterThan(12);
    }
  });

  it("looks pressed from the moment a finger is on it", () => {
    const pad = { x: 40, y: 60, w: 136, h: 136 };
    const fill = (pressed) => draw((pen) => drawPad(pen, pad, 0, THEME, { sword: "broad", pressed })).calls.find((call) => call.op === "set" && call.name === "fillStyle").value;
    expect(fill(true)).not.toBe(fill(false));
  });
});
