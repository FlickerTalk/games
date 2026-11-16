import { describe, expect, it } from "vitest";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawStone, sideMark } from "../src/pieces.js";
import { themeFor } from "../src/theme.js";

const theme = themeFor(null, { dark: false });
const R = 20;
const stone = (options) => draw((ctx) => drawStone(ctx, theme, 100, 100, R, options));
const diamonds = (ctx) => {
  let found = 0;
  let run = 0;
  for (const call of ctx.calls) {
    if (call.op === "moveTo") run = 1;
    else if (call.op === "lineTo" && run) run += 1;
    else if (call.op === "closePath") {
      if (run === 4) found += 1;
      run = 0;
    }
  }
  return found;
};
const rings = (ctx) => ctx.calls.filter((call) => call.op === "ellipse" && Math.abs(call.rx - R * 0.4) < 0.01 && Math.abs(call.ry - R * 0.4) < 0.01).length;
const width = (ctx) => {
  const area = bounds(painted(ctx));
  return area.right - area.left;
};

describe("a stone of Five in a Row", () => {
  it("tells the sides apart by its mark, not by its shade alone: a diamond on the black stone, a ring on the white one", () => {
    expect([diamonds(stone({ side: 0 })), rings(stone({ side: 0 }))]).toEqual([1, 0]);
    expect([diamonds(stone({ side: 1 })), rings(stone({ side: 1 }))]).toEqual([0, 1]);
  });

  it("sits on its crossing with its flat shadow under it, inside the room of its crossing", () => {
    for (const side of [0, 1]) {
      const area = bounds(painted(stone({ side })));
      expect(area.left).toBeGreaterThanOrEqual(100 - R * 1.05);
      expect(area.right).toBeLessThanOrEqual(100 + R * 1.05);
      expect(area.top).toBeGreaterThanOrEqual(100 - R);
      expect(area.bottom).toBeLessThanOrEqual(100 + R * 1.15);
      expect(area.bottom - 100).toBeGreaterThan(100 - area.top);
    }
  });

  it("grows from half its size as it is placed, and rises when it cheers", () => {
    expect(width(stone({ side: 0, scale: 0.5 }))).toBeLessThan(width(stone({ side: 0 })) * 0.6);
    const still = bounds(painted(stone({ side: 1 })));
    const lifted = bounds(painted(stone({ side: 1, lift: 6 })));
    expect(lifted.top).toBeCloseTo(still.top - 6, 6);
  });

  it("shows faded while its move waits for the other phone, and leaves the context as it found it", () => {
    const faded = stone({ side: 0, alpha: 0.55 });
    expect(faded.calls.filter((call) => call.op === "set" && call.name === "globalAlpha").map((call) => call.value)).toContain(0.55);
    expect(faded.depth).toBe(0);
  });
});

describe("the mark of a side beside a player's name", () => {
  it("is a small drawing of that side's stone, hidden from screen readers", () => {
    const [black, white] = [sideMark(0), sideMark(1)];
    for (const mark of [black, white]) {
      expect(mark).toMatch(/^<svg [^>]*aria-hidden="true"/);
      expect(mark).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
    }
    expect(black).toContain("<polygon");
    expect(white).not.toContain("<polygon");
    expect(white).toContain('fill="none"');
    expect(black).not.toContain('fill="none"');
  });
});
