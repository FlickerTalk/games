import { describe, expect, it } from "vitest";
import { barLayout, drawPortrait, drawStar, drawTopBar, drawVolumeLine, starMarks } from "../../src/canvas/bar.js";
import { themeFromTokens } from "../../src/canvas/theme.js";
import { bounds, colours, draw, painted } from "./recorder.js";
import { tokensFor } from "./themes.js";

const UI = themeFromTokens(tokensFor("mono-dark"));
const sound = { level: "high", music: true, open: false, volume: 0.8 };
const stars = { two: 180, three: 240 };
const texts = (ctx) => ctx.calls.filter((call) => call.op === "fillText").map((call) => call.text);
const fontSizes = (ctx) => ctx.calls.filter((call) => call.name === "font").map((call) => Number(/(\d+(?:\.\d+)?)px/.exec(call.value)[1]));
const bar = (layout, state, time = 0) => draw((pen) => drawTopBar(pen, layout, { score: 0, best: null, thresholds: stars, sound, lang: "en", ...state }, UI, time));
const starPaths = (ctx) => ctx.calls.filter((call, at) => call.op === "moveTo" && ctx.calls[at + 9]?.op === "lineTo" && ctx.calls[at + 10]?.op === "closePath");

describe("the top bar's layout", () => {
  it("puts the pause, the speaker and the music side by side at the top right, inside the frame", () => {
    for (const [width, height] of [[360, 588], [384, 801], [844, 338], [1280, 748], [328, 343]]) {
      const layout = barLayout(width, height, {});
      const { pause, speaker, music } = layout.controls;
      expect(pause.y).toBe(music.y);
      expect(pause.x < speaker.x && speaker.x < music.x).toBe(true);
      expect(music.x + music.w).toBeLessThanOrEqual(width);
      expect(Math.min(pause.w, pause.h)).toBeGreaterThanOrEqual(48);
      expect(layout.volume.x).toBeGreaterThanOrEqual(0);
      expect(layout.volume.x + layout.volume.w).toBeLessThanOrEqual(width);
    }
  });

  it("makes room for the rival only when there is one, and can leave the pause out", () => {
    expect(barLayout(384, 801, {}).rival).toBeNull();
    expect(barLayout(384, 801, { rival: true }).rival.size).toBeGreaterThanOrEqual(32);
    expect(barLayout(384, 801, { pause: false }).controls.pause).toBeNull();
  });
});

describe("the top bar", () => {
  it("shows the score and the best mark in digits, and nothing else written", () => {
    const ctx = bar(barLayout(384, 801, {}), { score: 1234, best: 480 });
    expect(texts(ctx)).toEqual(["1,234", "480"]);
  });

  it("writes the numbers the way the player's language does", () => {
    const ctx = bar(barLayout(384, 801, {}), { score: 1234, lang: "ar" });
    expect(texts(ctx)).toEqual([new Intl.NumberFormat("ar").format(1234)]);
  });

  it("writes every number 20 px or larger", () => {
    const rival = { player: { who: "flick" }, score: 96, thinking: false };
    for (const [width, height] of [[384, 801], [360, 343]]) {
      const ctx = bar(barLayout(width, height, { rival: true }), { score: 12, best: 40, rival });
      expect(Math.min(...fontSizes(ctx)), `${width}x${height}`).toBeGreaterThanOrEqual(20);
    }
  });

  it("stays inside the bar, its rival's thinking dots included", () => {
    const layout = barLayout(360, 588, { rival: true });
    const rival = { player: { who: "flick" }, score: null, thinking: true };
    const box = bounds(painted(bar(layout, { score: 12, best: 40, rival }, 0.4)));
    expect(box.left).toBeGreaterThanOrEqual(layout.bar.x - 2);
    expect(box.right).toBeLessThanOrEqual(layout.bar.x + layout.bar.w + 2);
    expect(box.top).toBeGreaterThanOrEqual(layout.bar.y - 2);
    expect(box.bottom).toBeLessThanOrEqual(layout.bar.y + layout.bar.h + 6);
  });

  it("writes the rival's score once they have one", () => {
    const rival = { player: { who: "flick" }, score: 96, thinking: false };
    expect(texts(bar(barLayout(384, 801, { rival: true }), { score: 12, rival }))).toContain("96");
  });

  it("is a flat card of the app's surface, every colour from the palette", () => {
    const palette = new Set(Object.values(UI).filter((value) => typeof value === "string"));
    const ctx = bar(barLayout(384, 801, {}), { score: 40, best: 80 });
    for (const colour of colours(ctx)) expect(palette.has(colour), colour).toBe(true);
    expect(colours(ctx)).toContain(UI.surface);
    expect(ctx.calls.filter((call) => call.op === "arcTo").some((call) => call.radius === 16)).toBe(true);
  });

  it("shows the control under the finger pressed", () => {
    const layout = barLayout(384, 801, {});
    const up = bar(layout, { score: 0 });
    const down = bar(layout, { score: 0, press: { kind: "pause" } });
    expect(colours(down)).toContain(UI.pressed);
    expect(colours(down)).not.toEqual(colours(up));
  });

  it("places the stars of the progress line at the scores that give them, and leaves the line out of a crowded bar", () => {
    expect(starMarks(stars)).toEqual([0.375, 0.75, 1]);
    expect(starPaths(bar(barLayout(384, 801, {}), { score: 100 }))).toHaveLength(3);
    const crowded = barLayout(360, 588, { rival: true });
    expect(crowded.progress.w).toBeLessThan(120);
    expect(starPaths(bar(crowded, { score: 0, rival: { player: { who: "flick" }, score: 0 } }))).toHaveLength(0);
    expect(starPaths(bar(barLayout(384, 801, {}), { score: 100, best: null, thresholds: null }))).toHaveLength(0);
  });
});

describe("the volume line", () => {
  it("unfolds inside its area, its handle where the volume is", () => {
    const area = { x: 100, y: 100, w: 240, h: 64 };
    const quiet = draw((pen) => drawVolumeLine(pen, area, 0, UI));
    const loud = draw((pen) => drawVolumeLine(pen, area, 1, UI));
    expect(bounds(painted(quiet)).left).toBeGreaterThanOrEqual(100);
    expect(bounds(painted(loud)).right).toBeLessThanOrEqual(340);
    const handle = (ctx) => ctx.calls.filter((call) => call.op === "arc").at(-1).points[0][0];
    expect(handle(loud)).toBeGreaterThan(handle(quiet));
  });
});

describe("a star and a portrait", () => {
  it("lights a star with the accent and leaves an unlit one quiet", () => {
    expect(colours(draw((pen) => drawStar(pen, 0, 0, 24, true, UI)))).toContain(UI.accent);
    expect(colours(draw((pen) => drawStar(pen, 0, 0, 24, false, UI)))).not.toContain(UI.accent);
  });

  it("puts a player's face on a disc with their score beside it or under it", () => {
    const beside = draw((pen) => drawPortrait(pen, 100, 100, 40, { player: { who: "flick" }, score: 7 }, UI, { lang: "en", score: "left" }));
    const under = draw((pen) => drawPortrait(pen, 100, 100, 40, { player: { who: "flick" }, score: 7 }, UI, { lang: "en", score: "below" }));
    const at = (ctx) => ctx.calls.find((call) => call.op === "fillText").points[0];
    expect(at(beside)[0]).toBeLessThan(80);
    expect(at(under)[1]).toBeGreaterThan(120);
    expect(texts(draw((pen) => drawPortrait(pen, 0, 0, 40, { player: { who: "flick" }, score: null, thinking: true }, UI, { lang: "en" })))).toEqual([]);
  });
});
