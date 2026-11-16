import { describe, expect, it } from "vitest";
import { bounds, contains, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { drawCrown, drawPiece, sideMark } from "../src/pieces.js";
import { themeFor } from "../src/theme.js";

const theme = themeFor(null, { dark: false });
const piece = (options) => draw((ctx) => drawPiece(ctx, theme, 100, 100, 20, options));
const polygons = (ctx, corners) => {
  let found = 0;
  let run = 0;
  for (const call of ctx.calls) {
    if (call.op === "moveTo") run = 1;
    else if (call.op === "lineTo" && run) run += 1;
    else if (call.op === "closePath") {
      if (run === corners) found += 1;
      run = 0;
    }
  }
  return found;
};

describe("a checkers piece", () => {
  it("is a plain disc for a man, and a man never wears the crown", () => {
    for (const side of [0, 1]) {
      const man = piece({ side, king: false });
      expect(polygons(man, 7), `side ${side}`).toBe(0);
      expect(man.depth).toBe(0);
    }
  });

  it("wears the crown over the same disc once it is a king", () => {
    for (const side of [0, 1]) {
      const [man, king] = [piece({ side, king: false }), piece({ side, king: true })];
      expect(polygons(king, 7), `side ${side}`).toBe(1);
      expect(contains(shapes(king), shapes(man).slice(0, -1)), `side ${side}`).toBe(true);
    }
  });

  it("tells the sides apart by the shape of its mark, not by colour alone", () => {
    expect(polygons(piece({ side: 0 }), 4)).toBe(0);
    expect(polygons(piece({ side: 1 }), 4)).toBe(1);
  });

  it("stays inside its square, lifted or not", () => {
    for (const lift of [0, 8]) {
      const area = bounds(painted(piece({ side: 1, king: true, lift })));
      expect(area.left).toBeGreaterThanOrEqual(100 - 20 * 1.1);
      expect(area.right).toBeLessThanOrEqual(100 + 20 * 1.1);
      expect(area.bottom).toBeLessThanOrEqual(100 + 20 * 1.2 - lift);
      expect(area.top).toBeGreaterThanOrEqual(100 - 20 * 1.1 - lift);
    }
  });

  it("pops its crown on from nothing to full size", () => {
    expect(draw((ctx) => drawCrown(ctx, theme, 0, 0, 20, 0)).calls).toHaveLength(0);
    const width = (progress) => {
      const area = bounds(painted(draw((ctx) => drawCrown(ctx, theme, 0, 0, 20, progress))));
      return area.right - area.left;
    };
    expect(width(0.2)).toBeLessThan(width(1));
    expect(width(1)).toBeGreaterThan(18);
  });

  it("shows faded while its move waits for the other phone", () => {
    const faded = piece({ side: 0, alpha: 0.5 });
    expect(faded.calls.filter((call) => call.op === "set" && call.name === "globalAlpha").map((call) => call.value)).toContain(0.5);
  });
});

describe("the mark of a side beside a player's name", () => {
  it("is a small drawing of that side's piece, hidden from screen readers", () => {
    const [dark, light] = [sideMark(0), sideMark(1)];
    expect(dark).not.toBe(light);
    for (const mark of [dark, light]) {
      expect(mark).toMatch(/^<svg [^>]*aria-hidden="true"/);
      expect(mark).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
    }
    expect(light).toContain("<polygon");
    expect(dark).not.toContain("<polygon");
  });
});
