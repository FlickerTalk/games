import { describe, expect, it } from "vitest";
import { bounds, draw, painted } from "../../../kit/test/avatars/recorder.js";
import { drawBar, drawVolume, starMarks } from "../src/bar.js";
import { playLayout } from "../src/layout.js";
import { THEME } from "../src/theme.js";

const sound = { level: "high", music: true, open: false, volume: 0.8 };
const texts = (ctx) => ctx.calls.filter((call) => call.op === "fillText").map((call) => call.text);

describe("the top bar", () => {
  it("shows the score and the best mark in digits, and nothing else written", () => {
    const layout = playLayout(384, 801, { fill: true });
    const ctx = draw((pen) => drawBar(pen, layout, { score: 1234, best: 480, thresholds: { two: 180, three: 240 }, sound, lang: "en" }, THEME, 0));
    expect(texts(ctx)).toEqual(["1,234", "480"]);
    for (const text of texts(ctx)) expect(text).toMatch(/^[\d,.\s٫٬٠-٩]+$/);
  });

  it("writes the numbers the way the player's language does", () => {
    const layout = playLayout(384, 801, { fill: true });
    const ctx = draw((pen) => drawBar(pen, layout, { score: 1234, best: null, thresholds: { two: 180, three: 240 }, sound, lang: "ar" }, THEME, 0));
    expect(texts(ctx)).toEqual([new Intl.NumberFormat("ar").format(1234)]);
  });

  it("stays inside the bar, its rival's thinking dots included", () => {
    const layout = playLayout(360, 588, { fill: true, rival: true });
    const rival = { player: { who: "flick" }, score: null, thinking: true };
    const box = bounds(painted(draw((pen) => drawBar(pen, layout, { score: 12, best: 40, thresholds: { two: 180, three: 240 }, sound, rival, lang: "en" }, THEME, 0.4))));
    expect(box.left).toBeGreaterThanOrEqual(layout.bar.x - 2);
    expect(box.right).toBeLessThanOrEqual(layout.bar.x + layout.bar.w + 2);
    expect(box.top).toBeGreaterThanOrEqual(layout.bar.y - 2);
    expect(box.bottom).toBeLessThanOrEqual(layout.bar.y + layout.bar.h + 6);
  });

  it("writes the rival's score once they have one", () => {
    const layout = playLayout(384, 801, { fill: true, rival: true });
    const rival = { player: { who: "flick" }, score: 96, thinking: false };
    const ctx = draw((pen) => drawBar(pen, layout, { score: 12, best: null, thresholds: { two: 180, three: 240 }, sound, rival, lang: "en" }, THEME, 0));
    expect(texts(ctx)).toContain("96");
  });

  it("places the stars of the progress line at the scores that give them", () => {
    expect(starMarks({ two: 180, three: 240 })).toEqual([0.375, 0.75, 1]);
  });

  it("unfolds one volume line, its handle where the volume is", () => {
    const area = { x: 100, y: 100, w: 240, h: 64 };
    const quiet = bounds(painted(draw((pen) => drawVolume(pen, area, 0, THEME))));
    const loud = draw((pen) => drawVolume(pen, area, 1, THEME));
    expect(quiet.left).toBeGreaterThanOrEqual(100);
    expect(bounds(painted(loud)).right).toBeLessThanOrEqual(340);
    const handle = (ctx) => ctx.calls.filter((call) => call.op === "arc").at(-1).points[0][0];
    expect(handle(loud)).toBeGreaterThan(handle(draw((pen) => drawVolume(pen, area, 0, THEME))));
  });
});

describe("a crowded bar", () => {
  it("leaves out the star line rather than squeezing its stars together", () => {
    const layout = playLayout(360, 588, { fill: true, rival: true });
    expect(layout.progress.w).toBeLessThan(120);
    const rival = { player: { who: "flick" }, score: 0, thinking: false };
    const ctx = draw((pen) => drawBar(pen, layout, { score: 0, best: null, thresholds: { two: 180, three: 240 }, sound, rival, lang: "en" }, THEME, 0));
    const stars = ctx.calls.filter((call, at) => call.op === "moveTo" && ctx.calls[at + 9]?.op === "lineTo" && ctx.calls[at + 10]?.op === "closePath");
    expect(stars).toHaveLength(0);
  });
});
