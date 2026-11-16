import { describe, expect, it } from "vitest";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawPiece, sideMark } from "../src/pieces.js";
import { themeFor } from "../src/theme.js";

const theme = themeFor(null, { dark: false });
const SIZE = 80;
const piece = (options) => draw((ctx) => drawPiece(ctx, theme, 100, 100, SIZE, options));
const near = (value, target) => Math.abs(value - target) < 0.01;
const arcsOf = (ctx, radius) => ctx.calls.filter((call) => call.op === "arc" && near(call.radius, radius));
const bars = (ctx) => ctx.calls.filter((call) => call.op === "lineTo").length;
const ellipses = (ctx) => ctx.calls.filter((call) => call.op === "ellipse");

describe("a Tic-Tac-Toe piece", () => {
  it("is a cross of two bars for one side and a ring for the other, told apart by shape", () => {
    const [cross, ring] = [piece({ side: 0 }), piece({ side: 1 })];
    expect(bars(cross)).toBeGreaterThanOrEqual(4);
    expect(arcsOf(cross, SIZE * 0.32)).toHaveLength(0);
    expect(arcsOf(ring, SIZE * 0.32)).toHaveLength(2);
    expect(bars(ring)).toBe(0);
    expect(cross.depth + ring.depth).toBe(0);
  });

  it("looks out with two open eyes and a smile, and is surprised when its side has lost", () => {
    for (const side of [0, 1]) {
      const calm = piece({ side });
      expect(ellipses(calm), `side ${side}`).toHaveLength(4);
      expect(arcsOf(calm, SIZE * 0.11), `side ${side}`).toHaveLength(1);
      const surprised = piece({ side, face: "surprised" });
      expect(arcsOf(surprised, SIZE * 0.11), `side ${side}`).toHaveLength(0);
      const mouth = ellipses(surprised).at(-1);
      expect(mouth.points[0][1], `side ${side}`).toBeGreaterThan(100);
    }
  });

  it("stays inside its cell, settled, popping in or cheering", () => {
    for (const options of [{}, { grow: 0.6 }, { lift: 6, tilt: 0.06 }]) {
      for (const side of [0, 1]) {
        const area = bounds(painted(piece({ side, ...options })));
        const lift = options.lift ?? 0;
        expect(area.left).toBeGreaterThanOrEqual(100 - SIZE * 0.52);
        expect(area.right).toBeLessThanOrEqual(100 + SIZE * 0.52);
        expect(area.top).toBeGreaterThanOrEqual(100 - SIZE * 0.52 - lift);
        expect(area.bottom).toBeLessThanOrEqual(100 + SIZE * 0.52 - lift);
      }
    }
  });

  it("pops in from nothing, overshooting a little before it settles", () => {
    expect(piece({ side: 1, grow: 0 }).calls).toHaveLength(0);
    const width = (grow) => {
      const area = bounds(painted(piece({ side: 1, grow })));
      return area.right - area.left;
    };
    expect(width(0.2)).toBeLessThan(width(1));
    expect(width(0.6)).toBeGreaterThan(width(1));
  });

  it("shows faded while its move waits for the other phone", () => {
    const faded = piece({ side: 0, alpha: 0.55 });
    expect(faded.calls.filter((call) => call.op === "set" && call.name === "globalAlpha").map((call) => call.value)).toContain(0.55);
  });
});

describe("the mark of a side beside a player's name", () => {
  it("is a small drawing of that side's piece, hidden from screen readers", () => {
    const [cross, ring] = [sideMark(0), sideMark(1)];
    expect(cross).not.toBe(ring);
    for (const mark of [cross, ring]) {
      expect(mark).toMatch(/^<svg [^>]*aria-hidden="true"/);
      expect(mark).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
    }
    expect(cross).toContain("<path");
    expect(ring).toContain('<circle r="16"');
    expect(cross).not.toContain('<circle r="16"');
  });
});
