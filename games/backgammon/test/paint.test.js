import { describe, expect, it } from "vitest";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { barSpot, layoutFor, pipsAt, stackSpot, traySpot } from "../src/layout.js";
import { drawTable } from "../src/paint.js";
import { initial } from "../src/rules.js";
import { themeFor } from "../src/theme.js";

const light = themeFor(null, { dark: false });
const dark = themeFor(null, { dark: true });
const empty = () => Array.from({ length: 24 }, () => [0, 0]);
const view = (extra = {}) => {
  const start = initial();
  return { size: 352, mirrored: false, me: 0, time: 0, points: start.points, bar: [0, 0], off: [0, 0], ...extra };
};
const bodies = (ctx, spot) => ctx.calls.filter((call) => call.op === "arc" && Math.abs(call.points[0][0] - spot.x) < 0.01 && Math.abs(call.points[0][1] - spot.y) < 0.01 && Math.abs(call.radius - spot.r) < 0.01).length;
const triangles = (ctx) => {
  let found = 0;
  let run = 0;
  for (const call of ctx.calls) {
    if (call.op === "moveTo") run = 1;
    else if (call.op === "lineTo" && run) run += 1;
    else if (call.op === "closePath") {
      if (run === 3) found += 1;
      run = 0;
    }
  }
  return found;
};
const texts = (ctx) => ctx.calls.filter((call) => call.op === "fillText").map((call) => call.text);

describe("the backgammon table, drawn", () => {
  it("stays inside its square at every size the room or a full screen can give", () => {
    for (const size of [200, 300, 343, 352, 480, 720]) {
      const area = bounds(painted(draw((ctx) => drawTable(ctx, light, view({ size, dice: { side: 0, faces: [3, 5], used: [false, false] }, pips: [167, 167] })))));
      expect(area.left, `${size}`).toBeGreaterThanOrEqual(0);
      expect(area.top, `${size}`).toBeGreaterThanOrEqual(0);
      expect(area.right, `${size}`).toBeLessThanOrEqual(size);
      expect(area.bottom, `${size}`).toBeLessThanOrEqual(size);
    }
  });

  it("draws twenty-four points and no words, only the digits the game needs", () => {
    const ctx = draw((pen) => drawTable(pen, light, view()));
    expect(triangles(ctx)).toBeGreaterThanOrEqual(24);
    expect(texts(ctx).every((text) => /^\d+$/.test(text))).toBe(true);
  });

  it("stands every checker on its point, the user's home at the bottom right, and turns the table for the other side", () => {
    const layout = layoutFor(352);
    const straight = draw((ctx) => drawTable(ctx, light, view()));
    expect(bodies(straight, stackSpot(layout, 5, 4, 5))).toBe(1);
    expect(bodies(straight, stackSpot(layout, 23, 1, 2))).toBe(1);
    expect(bodies(straight, stackSpot(layout, 22, 0, 1))).toBe(0);
    const turned = draw((ctx) => drawTable(ctx, light, view({ mirrored: true, me: 1 })));
    expect(bodies(turned, stackSpot(layout, 18, 4, 5, { mirrored: true }))).toBe(1);
    expect(stackSpot(layout, 18, 0, 5, { mirrored: true }).y).toBeGreaterThan(layout.field.y + layout.field.h / 2);
  });

  it("counts a stack of six or more on its last checker", () => {
    const points = empty();
    points[3][0] = 9;
    points[20][1] = 5;
    const ctx = draw((pen) => drawTable(pen, light, view({ points })));
    expect(texts(ctx)).toEqual(["9"]);
  });

  it("puts hit checkers on the bar and borne-off ones in the trays, with how many are off", () => {
    const layout = layoutFor(352);
    const ctx = draw((pen) => drawTable(pen, light, view({ points: empty(), bar: [2, 1], off: [7, 0] })));
    expect(bodies(ctx, barSpot(layout, true, 1, 2))).toBe(1);
    expect(bodies(ctx, barSpot(layout, false, 0, 1))).toBe(1);
    expect(bodies(ctx, traySpot(layout, true, 4, 7))).toBe(1);
    expect(texts(ctx)).toEqual(["7"]);
  });

  it("draws a travelling checker on its way, at neither end", () => {
    const layout = layoutFor(352);
    const points = empty();
    points[2][0] = 1;
    const flying = [{ side: 0, from: { place: 10, index: 0, count: 1 }, to: { place: 2, index: 1, count: 2 }, progress: 0.5 }];
    const ctx = draw((pen) => drawTable(pen, light, view({ points, flying })));
    const [from, to] = [stackSpot(layout, 10, 0, 1), stackSpot(layout, 2, 1, 2)];
    expect(bodies(ctx, from)).toBe(0);
    expect(bodies(ctx, to)).toBe(0);
    expect(bodies(ctx, { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2, r: from.r })).toBe(1);
  });

  it("draws the dice and both sides' pip counts in the dock under the table", () => {
    const layout = layoutFor(352);
    const ctx = draw((pen) => drawTable(pen, light, view({ dice: { side: 0, faces: [6, 1], used: [false, true] }, pips: [160, 167] })));
    expect(texts(ctx)).toEqual(["160", "167"]);
    const pipText = ctx.calls.filter((call) => call.op === "fillText");
    for (const call of pipText) expect(call.points[0][1]).toBeGreaterThan(layout.dock.y);
    const [mine] = pipsAt(layout);
    expect(bodies(ctx, { x: mine.mark.x, y: mine.mark.y, r: mine.mark.r })).toBe(1);
  });

  it("gives the table a light rim on a dark page, and keeps it plain on a light one", () => {
    const strokes = (theme) => draw((ctx) => drawTable(ctx, theme, view())).calls.filter((call) => call.op === "set" && call.name === "strokeStyle").map((call) => call.value);
    expect(strokes(dark)).toContain(dark.rim);
    expect(strokes(light)).not.toContain(dark.rim);
  });

  it("shakes only the top checker of a point", () => {
    const layout = layoutFor(352);
    const ctx = draw((pen) => drawTable(pen, light, view({ shakes: [{ place: 5, offset: 0.5 }] })));
    const top = stackSpot(layout, 5, 4, 5);
    expect(bodies(ctx, top)).toBe(0);
    expect(bodies(ctx, { ...top, x: top.x + 0.5 * top.r * 0.25 })).toBe(1);
    expect(bodies(ctx, stackSpot(layout, 5, 3, 5))).toBe(1);
  });

  it("draws a checker held by a finger where the finger is, lifted off the table", () => {
    const ctx = draw((pen) => drawTable(pen, light, view({ floating: { side: 0, x: 200, y: 150, lift: 6 } })));
    expect(bodies(ctx, { x: 200, y: 144, r: layoutFor(352).radius })).toBe(1);
  });
});
