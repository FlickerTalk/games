import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { FIELDS } from "../src/levels.js";
import { drawCrowd, drawField } from "../src/scene.js";
import { THEME } from "../src/theme.js";

const AREA = { x: 0, y: 0, w: 384, h: 801 };
const field = (name, options = {}) => draw((ctx) => drawField(ctx, AREA, name, THEME, { horizon: 220, top: 100, lineAt: 700, ...options }));

describe("the fields", () => {
  it("are three places that do not look alike, each drawn from its own colours of the theme", () => {
    const seen = FIELDS.map((name) => shapes(field(name)).join("\n"));
    expect(new Set(seen).size).toBe(3);
    for (const name of FIELDS) {
      const used = new Set(colours(field(name)));
      const own = new Set(Object.values(THEME.art.fields[name]));
      for (const colour of used) expect(own.has(colour), `${name} ${colour}`).toBe(true);
      expect(used.has(THEME.art.fields[name].sky), name).toBe(true);
      expect(used.has(THEME.art.fields[name].ground), name).toBe(true);
    }
  });

  it("clip to their area, cover it from top to bottom and leave the context as they found it", () => {
    for (const name of FIELDS) {
      const ctx = field(name);
      expect(ctx.depth).toBe(0);
      expect(ctx.calls.some((call) => call.op === "clip")).toBe(true);
      const fills = ctx.calls.filter((call) => call.op === "fillRect").flatMap((call) => call.points);
      expect(bounds(fills).top).toBe(0);
      expect(bounds(fills).bottom).toBeGreaterThanOrEqual(801);
    }
  });

  it("draw the penalty line where the layout says, and none when it would fall off the frame", () => {
    const withLine = shapes(field("school")).length;
    expect(shapes(field("school", { lineAt: null })).length).toBeLessThan(withLine);
    expect(shapes(field("school", { lineAt: 799 })).length).toBeLessThan(withLine);
  });

  it("move the sea and nothing else as time passes", () => {
    expect(shapes(field("beach", { time: 0 }))).not.toEqual(shapes(field("beach", { time: 1 })));
    expect(shapes(field("school", { time: 0 }))).toEqual(shapes(field("school", { time: 1 })));
  });
});

describe("the crowd", () => {
  const crowd = (options) => draw((ctx) => drawCrowd(ctx, { x: 20, y: 130, w: 344, h: 50 }, THEME, options));

  it("is a row of round faces inside its band, as many as fit", () => {
    const ctx = crowd({ time: 0, reaction: 0 });
    const box = bounds(painted(ctx));
    expect(box.left).toBeGreaterThanOrEqual(20);
    expect(box.right).toBeLessThanOrEqual(364);
    expect(ctx.calls.filter((call) => call.op === "arc" && call.radius === 10)).toHaveLength(Math.floor(344 / 36));
    expect(ctx.depth).toBe(0);
  });

  it("raises its arms and hops when something happens, never faster than three times a second", () => {
    expect(crowd({ time: 0.2, reaction: 1 }).calls.length).toBeGreaterThan(crowd({ time: 0.2, reaction: 0 }).calls.length);
    const hop = (time) => crowd({ time, reaction: 1 }).calls.find((call) => call.op === "arc").points[0][1];
    const tops = Array.from({ length: 60 }, (_, at) => hop(at / 60));
    const turns = tops.filter((top, at) => at > 0 && at < 59 && (top - tops[at - 1]) * (tops[at + 1] - top) < 0).length;
    expect(turns).toBeLessThanOrEqual(6);
  });
});
