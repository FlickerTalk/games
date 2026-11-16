import { describe, expect, it } from "vitest";
import { cellCentre } from "../../../kit/src/tabletop/grid.js";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawBoard, edgeOf, layoutFor, touchBox } from "../src/paint.js";
import { strokeOf } from "../src/pieces.js";
import { BOXES, DOTS, H, LINES, initial, play } from "../src/rules.js";
import { drawers } from "../src/moves.js";
import { themeFor } from "../src/theme.js";

const light = themeFor(null, { dark: false });
const dark = themeFor(null, { dark: true });
const through = (lines) => lines.reduce((state, line) => play(state, line, state.next).state, initial());

function view(lines = [], extra = {}) {
  const state = through(lines);
  return { size: 352, lines: state.lines, boxes: state.boxes, drawers: drawers(lines), open: true, last: lines.at(-1) ?? null, pending: null, moving: null, popping: {}, bursts: [], extra: [], ...extra };
}

const near = (one, two) => Math.abs(one - two) < 0.01;
const dashed = (ctx) => ctx.calls.filter((call) => call.op === "setLineDash" && call.segments.length).length;
const underlines = (ctx, layout, box) => {
  const centre = cellCentre(layout.grid, box);
  const size = layout.step * 0.88;
  return ctx.calls.filter((call) => call.op === "moveTo" && near(call.points[0][0], centre.x - size * 0.35) && near(call.points[0][1], centre.y + size * 0.29)).length;
};
const ringsAt = (ctx, point, radius) => ctx.calls.filter((call) => call.op === "arc" && near(call.points[0][0], point.x) && near(call.points[0][1], point.y) && near(call.radius, radius)).length;
const segmentDistance = ({ x, y, horizontal }, step, px, py) => {
  const along = horizontal ? Math.min(Math.max(px, x - step / 2), x + step / 2) : x;
  const across = horizontal ? y : Math.min(Math.max(py, y - step / 2), y + step / 2);
  return Math.hypot(px - along, py - across);
};
const holds = (box, px, py) => Math.abs(px - (box.x + box.w / 2)) + Math.abs(py - (box.y + box.h / 2)) < (box.w * Math.SQRT2) / 2;

describe("the dots and boxes board, drawn", () => {
  it("lays the page out inside its square at every size the room or a full screen can give, with every line's touch area on it", () => {
    for (const size of [120, 214, 300, 352, 480, 720]) {
      const layout = layoutFor(size);
      expect(layout.step * BOXES).toBeCloseTo(layout.frame.inner.w, 6);
      const area = bounds(painted(draw((ctx) => drawBoard(ctx, light, view([0, 4, 20, 21], { size })))));
      expect(area.left, `${size}`).toBeGreaterThanOrEqual(0);
      expect(area.top, `${size}`).toBeGreaterThanOrEqual(0);
      expect(area.right, `${size}`).toBeLessThanOrEqual(size);
      expect(area.bottom, `${size}`).toBeLessThanOrEqual(size);
      const { outer } = layout.frame;
      for (let line = 0; line < LINES; line += 1) {
        const { x, y } = edgeOf(layout, line);
        const reach = layout.step / 2;
        expect(x - reach, `${size} line ${line}`).toBeGreaterThanOrEqual(outer.x - 0.01);
        expect(y - reach, `${size} line ${line}`).toBeGreaterThanOrEqual(outer.y - 0.01);
        expect(x + reach, `${size} line ${line}`).toBeLessThanOrEqual(outer.x + outer.w + 0.01);
        expect(y + reach, `${size} line ${line}`).toBeLessThanOrEqual(outer.y + outer.h + 0.01);
      }
    }
  });

  it("numbers the lines as the rules do, the flat ones first, row by row", () => {
    const layout = layoutFor(352);
    const { grid, step } = layout;
    expect(edgeOf(layout, 0)).toMatchObject({ x: grid.x + step / 2, y: grid.y, horizontal: true });
    expect(edgeOf(layout, H - 1)).toMatchObject({ x: grid.x + (BOXES - 0.5) * step, y: grid.y + BOXES * step, horizontal: true });
    expect(edgeOf(layout, H)).toMatchObject({ x: grid.x, y: grid.y + step / 2, horizontal: false });
    expect(edgeOf(layout, H + DOTS + 1)).toMatchObject({ x: grid.x + step, y: grid.y + step * 1.5, horizontal: false });
  });

  it("gives each line a touch area turned on its corner, the areas meeting without overlapping, each taking the taps nearest its line", () => {
    const layout = layoutFor(352);
    const { grid, step } = layout;
    for (let sample = 0; sample < 400; sample += 1) {
      const px = grid.x + ((sample * 37) % 101) / 100 * grid.w;
      const py = grid.y + ((sample * 61) % 103) / 102 * grid.h;
      const hits = [];
      for (let line = 0; line < LINES; line += 1) if (holds(touchBox(layout, line), px, py)) hits.push(line);
      expect(hits.length, `${px},${py}`).toBeLessThanOrEqual(1);
      if (!hits.length) continue;
      const distances = Array.from({ length: LINES }, (_, line) => segmentDistance(edgeOf(layout, line), step, px, py));
      expect(distances[hits[0]], `${px},${py}`).toBeCloseTo(Math.min(...distances), 6);
    }
    const box = touchBox(layout, 7);
    expect(box.w).toBeCloseTo(step / Math.SQRT2, 6);
    expect(box.h).toBe(box.w);
  });

  it("draws each open line as a track, each drawn one with its drawer's mark, and each claimed box with its owner's", () => {
    const layout = layoutFor(352);
    expect(dashed(draw((ctx) => drawBoard(ctx, light, view())))).toBe(LINES);
    const ctx = draw((pen) => drawBoard(pen, light, view([0, 4, 20, 21])));
    expect(dashed(ctx)).toBe(LINES - 4);
    expect(underlines(ctx, layout, 0)).toBe(1);
    expect(underlines(ctx, layout, 1)).toBe(0);
    expect(ctx.depth).toBe(0);
  });

  it("draws the line being drawn partway, and keeps the boxes it closes hidden until they pop", () => {
    const layout = layoutFor(352);
    const hidden = draw((ctx) => drawBoard(ctx, light, view([0, 4, 20, 21], { last: null, moving: { line: 21, progress: 0.5 }, popping: { 0: 0 } })));
    expect(underlines(hidden, layout, 0)).toBe(0);
    expect(dashed(hidden)).toBe(LINES - 3);
    const popping = draw((ctx) => drawBoard(ctx, light, view([0, 4, 20, 21], { last: null, popping: { 0: 0.5 } })));
    expect(underlines(popping, layout, 0)).toBe(0);
    expect(popping.calls.some((call) => call.op === "arcTo")).toBe(true);
  });

  it("rings the last line, turns the arrow of another turn on the box that gave it, and puts a clock on a line still on its way", () => {
    const layout = layoutFor(352);
    const thickness = strokeOf(layout.step);
    const last = edgeOf(layout, 21);
    const ctx = draw((pen) => drawBoard(pen, light, view([0, 4, 20, 21], { extra: [{ box: 0, side: 1, progress: 1 }] })));
    expect(ringsAt(ctx, last, thickness * 1.9)).toBe(1);
    const centre = cellCentre(layout.grid, 0);
    const round = (pen) => pen.calls.filter((call) => call.op === "arc" && near(call.points[0][0], centre.x) && near(call.points[0][1], centre.y) && call.radius > layout.step * 0.3).length;
    expect(round(ctx)).toBe(2);
    expect(round(draw((pen) => drawBoard(pen, light, view([0, 4, 20, 21]))))).toBe(0);
    const waiting = draw((pen) => drawBoard(pen, light, view([5], { pending: 5 })));
    const clock = edgeOf(layout, 5);
    expect(ringsAt(waiting, clock, Math.max(6, thickness * 1.4))).toBe(1);
    expect(ringsAt(waiting, clock, thickness * 1.9)).toBe(0);
    expect(waiting.calls.filter((call) => call.op === "set" && call.name === "globalAlpha").map((call) => call.value)).toContain(0.55);
  });

  it("gives the page a light rim on a dark page, and keeps its frame plain on a light one", () => {
    const strokes = (theme) => draw((ctx) => drawBoard(ctx, theme, view())).calls.filter((call) => call.op === "set" && call.name === "strokeStyle").map((call) => call.value);
    expect(strokes(dark)).toContain(dark.rim);
    expect(strokes(light)).not.toContain(dark.rim);
  });
});
