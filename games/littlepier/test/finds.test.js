import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawFind } from "../src/finds.js";
import { FINDS } from "../src/pond.js";
import { THEME } from "../src/theme.js";

describe("the funny finds", () => {
  it("are a boot, a chest that opens with a star, and a bottle with a drawing, within their size", () => {
    for (const kind of FINDS) {
      const ctx = draw((pen) => drawFind(pen, 100, 100, 70, kind, THEME, { time: 1 }));
      expect(ctx.depth, kind).toBe(0);
      const box = bounds(painted(ctx));
      expect(box.left, kind).toBeGreaterThanOrEqual(100 - 70 * 0.62);
      expect(box.right, kind).toBeLessThanOrEqual(100 + 70 * 0.62);
    }
    const shut = draw((pen) => drawFind(pen, 0, 0, 70, "chest", THEME, { open: 0 }));
    const open = draw((pen) => drawFind(pen, 0, 0, 70, "chest", THEME, { open: 1 }));
    expect(colours(open).filter((one) => one === THEME.art.star).length).toBeGreaterThan(colours(shut).filter((one) => one === THEME.art.star).length);
    expect(colours(draw((pen) => drawFind(pen, 0, 0, 70, "bottle", THEME)))).toContain(THEME.art.finds.picture);
  });
});
