import { describe, expect, it } from "vitest";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { countAt, drawBoard, layoutFor, pitAt, pitBox, rowBox } from "../src/paint.js";
import { initial } from "../src/rules.js";
import { themeFor } from "../src/theme.js";

const light = themeFor(null, { dark: false });
const dark = themeFor(null, { dark: true });
const START = initial().pits;
const view = (extra = {}) => ({ size: 352, flipped: false, pits: START, counts: START.map(String), open: [], active: null, last: null, pending: false, ...extra });
const texts = (ctx) => ctx.calls.filter((call) => call.op === "fillText");
const dashedRings = (ctx) => ctx.calls.filter((call) => call.op === "setLineDash" && call.segments.length).length;
const near = (call, point, reach) => call.points.some(([x, y]) => Math.hypot(x - point.x, y - point.y) < reach);

describe("the mancala board, drawn", () => {
  it("lays the tray out inside its square at every size the room or a full screen can give", () => {
    for (const size of [120, 214, 300, 352, 480, 720]) {
      const area = bounds(painted(draw((ctx) => drawBoard(ctx, light, view({ size })))));
      expect(area.left, `${size}`).toBeGreaterThanOrEqual(0);
      expect(area.top, `${size}`).toBeGreaterThanOrEqual(0);
      expect(area.right, `${size}`).toBeLessThanOrEqual(size);
      expect(area.bottom, `${size}`).toBeLessThanOrEqual(size);
    }
  });

  it("puts the user's six pits along the bottom from the left, the store on the right, and the other side's back along the top", () => {
    const layout = layoutFor(352);
    const mine = [0, 1, 2, 3, 4, 5].map((pit) => pitAt(layout, pit));
    const theirs = [7, 8, 9, 10, 11, 12].map((pit) => pitAt(layout, pit));
    for (let n = 1; n < 6; n += 1) {
      expect(mine[n].x).toBeGreaterThan(mine[n - 1].x);
      expect(theirs[n].x).toBeLessThan(theirs[n - 1].x);
    }
    expect(mine[0].y).toBeGreaterThan(theirs[0].y);
    expect(theirs[5].x).toBeCloseTo(mine[0].x, 6);
    expect(pitAt(layout, 6).x).toBeGreaterThan(mine[5].x);
    expect(pitAt(layout, 13).x).toBeLessThan(mine[0].x);
    expect(pitAt(layout, 6).ry).toBeGreaterThan(mine[0].ry * 2);
  });

  it("turns the board for the second side, its own pits along the bottom", () => {
    const layout = layoutFor(352);
    for (let pit = 0; pit < 14; pit += 1) expect(pitAt(layout, pit, true)).toEqual(pitAt(layout, (pit + 7) % 14));
    expect(countAt(layout, 13, true)).toEqual(countAt(layout, 6));
  });

  it("writes every pit's and store's count beside it, the user's below their pits and the other side's above theirs", () => {
    const layout = layoutFor(352);
    const counts = START.map((seeds, pit) => `${pit}:${seeds}`);
    const ctx = draw((pen) => drawBoard(pen, light, view({ counts })));
    expect(texts(ctx).map((call) => call.text).sort()).toEqual([...counts].sort());
    const at = (pit) => texts(ctx).find((call) => call.text === counts[pit]).points[0];
    expect(at(2)[1]).toBeGreaterThan(pitAt(layout, 2).y + pitAt(layout, 2).ry);
    expect(at(9)[1]).toBeLessThan(pitAt(layout, 9).y - pitAt(layout, 9).ry);
    expect(at(6)[1]).toBeCloseTo(at(2)[1], 6);
    expect(at(13)[1]).toBeCloseTo(at(9)[1], 6);
    expect(at(2)[0]).toBeCloseTo(pitAt(layout, 2).x, 6);
  });

  it("keeps each row's pits, rings and counts inside that row's outline, clear of the stores and of the other row", () => {
    for (const size of [214, 352, 720]) {
      const layout = layoutFor(size);
      const [bottom, top] = [rowBox(layout, true), rowBox(layout, false)];
      expect(top.y + top.h, `${size}`).toBeLessThan(bottom.y);
      for (const [box, pits] of [
        [bottom, [0, 1, 2, 3, 4, 5]],
        [top, [7, 8, 9, 10, 11, 12]],
      ]) {
        for (const pit of pits) {
          const place = pitAt(layout, pit);
          const count = countAt(layout, pit);
          const reach = place.ry + 10 * layout.unit;
          expect(box.y, `${size} ${pit}`).toBeLessThan(Math.min(place.y - reach, count.y - layout.font / 2));
          expect(box.y + box.h, `${size} ${pit}`).toBeGreaterThan(Math.max(place.y + reach, count.y + layout.font / 2));
        }
      }
      for (const store of [6, 13]) {
        const place = pitAt(layout, store);
        const count = countAt(layout, store);
        expect(Math.abs(count.y - place.y) - layout.font / 2, `${size} ${store}`).toBeGreaterThan(place.ry + 2 * layout.unit);
      }
    }
  });

  it("keeps the store's sparkles and the flying seeds inside the square", () => {
    for (const size of [214, 352, 720]) {
      for (const progress of [0.1, 0.5, 0.9]) {
        for (const store of [6, 13]) {
          const capture = { landing: store === 6 ? 0 : 12, across: store === 6 ? 12 : 0, store, side: store === 6 ? 0 : 1, progress };
          const ctx = draw((pen) => drawBoard(pen, light, view({ size, sparkle: { store, side: 0, progress }, capture, hop: { from: store, to: store === 6 ? 7 : 0, progress } })));
          const area = bounds(painted(ctx));
          expect(area.left, `${size} ${store} ${progress}`).toBeGreaterThanOrEqual(0);
          expect(area.right, `${size} ${store} ${progress}`).toBeLessThanOrEqual(size);
          expect(area.top, `${size} ${store} ${progress}`).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it("rings only the pits the user may sow, and outlines the row of the side to move", () => {
    expect(dashedRings(draw((ctx) => drawBoard(ctx, light, view())))).toBe(0);
    expect(dashedRings(draw((ctx) => drawBoard(ctx, light, view({ open: [1, 3, 4] }))))).toBe(3);
    const strokes = (extra) => draw((ctx) => drawBoard(ctx, light, view(extra))).calls.filter((call) => call.op === "stroke").length;
    expect(strokes({ active: 0 })).toBe(strokes({}) + 1);
  });

  it("carries the travelling seed raised between two pits, and the captured seeds towards the store", () => {
    const layout = layoutFor(352);
    const [from, to] = [pitAt(layout, 4), pitAt(layout, 5)];
    const hop = draw((ctx) => drawBoard(ctx, light, view({ hop: { from: 4, to: 5, progress: 0.5 } })));
    const raised = hop.calls.filter((call) => call.op === "moveTo" && call.points[0][0] > from.x && call.points[0][0] < to.x && call.points[0][1] < from.y - from.ry * 0.5);
    expect(raised.length).toBeGreaterThan(0);
    const still = draw((ctx) => drawBoard(ctx, light, view()));
    const capture = draw((ctx) => drawBoard(ctx, light, view({ capture: { landing: 2, across: 10, store: 6, side: 0, progress: 0.5 } })));
    const pebbles = (ctx) => ctx.calls.filter((call) => call.op === "bezierCurveTo").length / 3;
    expect(pebbles(capture)).toBeGreaterThan(pebbles(still));
    expect(capture.calls.some((call) => call.op === "moveTo" && near(call, pitAt(layout, 10), pitAt(layout, 10).rx * 1.1))).toBe(true);
  });

  it("marks the pit last sown from, and a move that waits for the other phone", () => {
    const layout = layoutFor(352);
    const repeatArrow = (ctx) => ctx.calls.filter((call) => call.op === "arc" && Math.abs(call.to - call.from) < Math.PI * 1.9 && near(call, pitAt(layout, 9), pitAt(layout, 9).rx * 1.2));
    expect(repeatArrow(draw((ctx) => drawBoard(ctx, light, view({ last: 9 }))))).toHaveLength(1);
    expect(repeatArrow(draw((ctx) => drawBoard(ctx, light, view())))).toHaveLength(0);
    const arcs = (extra) => draw((ctx) => drawBoard(ctx, light, view(extra))).calls.filter((call) => call.op === "arc").length;
    expect(arcs({ last: 9, pending: true })).toBeGreaterThan(arcs({ last: 9 }));
  });

  it("gives the tray a light rim on a dark page, and keeps its frame plain on a light one", () => {
    const strokes = (theme) => draw((ctx) => drawBoard(ctx, theme, view())).calls.filter((call) => call.op === "set" && call.name === "strokeStyle").map((call) => call.value);
    expect(strokes(dark)).toContain(dark.rim);
    expect(strokes(light)).not.toContain(dark.rim);
  });
});

describe("the mancala board's targets", () => {
  it("gives each of the user's pits a tall target over its half of the tray, side by side, the stores theirs at the ends", () => {
    for (const size of [214, 352, 720]) {
      const layout = layoutFor(size);
      const mine = [0, 1, 2, 3, 4, 5].map((pit) => pitBox(layout, pit));
      for (const [n, box] of mine.entries()) {
        const pit = pitAt(layout, n);
        expect(box.x).toBeLessThanOrEqual(pit.x - pit.rx);
        expect(box.x + box.w).toBeGreaterThanOrEqual(pit.x + pit.rx);
        expect(box.y).toBeLessThanOrEqual(pit.y - pit.ry);
        expect(box.y + box.h).toBeLessThanOrEqual(size);
        expect(box.h).toBeGreaterThan(box.w * 1.5);
        if (n) expect(box.x).toBeCloseTo(mine[n - 1].x + mine[n - 1].w, 6);
      }
      expect(pitBox(layout, 9).y + pitBox(layout, 9).h).toBeLessThanOrEqual(mine[0].y);
      expect(pitBox(layout, 13).x + pitBox(layout, 13).w).toBeLessThanOrEqual(mine[0].x);
      expect(pitBox(layout, 6).x).toBeGreaterThanOrEqual(mine[5].x + mine[5].w);
      for (let pit = 0; pit < 14; pit += 1) {
        const box = pitBox(layout, pit, true);
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.x + box.w).toBeLessThanOrEqual(size);
        expect(box.y + box.h).toBeLessThanOrEqual(size);
      }
    }
  });
});
