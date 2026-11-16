import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { SCENERIES, drawScenery, drawTrack } from "../src/scenery-art.js";
import { THEME } from "../src/theme.js";

const scenery = (name, width = 384, height = 801, horizon = 340) => draw((ctx) => drawScenery(ctx, { w: width, h: height }, name, { horizon, time: 0 }, THEME));
const lines = (ctx) => shapes(ctx).join("\n");

describe("the stations", () => {
  it("are the valley, the desert and the night, each drawn differently", () => {
    expect(SCENERIES).toEqual(["valley", "desert", "night"]);
    expect(new Set(SCENERIES.map((name) => lines(scenery(name)))).size).toBe(3);
  });

  it("fill the whole frame with sky above the track and ground below it", () => {
    for (const name of SCENERIES) {
      const ctx = scenery(name);
      const rects = ctx.calls.filter((call) => call.op === "fillRect");
      expect(rects[0].points, name).toEqual([[0, 0], [384, 801]]);
      expect(rects.some((call) => call.points[0][1] === 340 && call.points[1][1] === 801), name).toBe(true);
      expect(colours(ctx), name).toContain(THEME.art.sceneries[name].sky);
      expect(ctx.depth).toBe(0);
    }
  });

  it("stand the station house on the horizon, smaller in a short frame and never over the left half", () => {
    const house = (ctx) => bounds(ctx.calls.slice(ctx.calls.findLastIndex((call) => call.op === "ellipse")).filter((call) => call.op === "arcTo").flatMap((call) => call.points));
    const tall = house(scenery("valley"));
    const short = house(scenery("valley", 844, 338, 150));
    expect(tall.left).toBeGreaterThan(384 / 2);
    expect(tall.bottom).toBeGreaterThan(340);
    expect(tall.bottom).toBeLessThan(340 + 40);
    expect(short.bottom - short.top).toBeLessThan(tall.bottom - tall.top);
    expect(short.top).toBeGreaterThanOrEqual(0);
  });

  it("draws an unknown scenery as the valley and stays inside any frame's width by more than a hill", () => {
    expect(lines(scenery("nowhere"))).toBe(lines(scenery("valley")));
    const box = bounds(painted(scenery("desert", 1280, 748, 400)));
    expect(box.top).toBeGreaterThanOrEqual(-1);
  });
});

describe("the track", () => {
  it("lays two rails over evenly spaced sleepers, from end to end", () => {
    const ctx = draw((pen) => drawTrack(pen, 20, 300, 400, 1, THEME));
    const box = bounds(painted(ctx));
    expect([box.left, box.right]).toEqual([20, 420]);
    expect(box.bottom - box.top).toBeLessThan(24);
    expect(ctx.calls.filter((call) => call.op === "stroke").length).toBeGreaterThan(10);
    expect(ctx.depth).toBe(0);
  });
});
