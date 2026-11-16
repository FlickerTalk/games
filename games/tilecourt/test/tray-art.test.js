import { describe, expect, it } from "vitest";
import { bounds, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { pieceOf } from "../src/pieces.js";
import { THEME } from "../src/theme.js";
import { drawTray, slotCell } from "../src/tray-art.js";

const slots = [{ x: 0, y: 500, w: 128, h: 110 }, { x: 128, y: 500, w: 128, h: 110 }, { x: 256, y: 500, w: 128, h: 110 }];

describe("the tray", () => {
  it("shows each piece smaller than on the court, never wider or taller than its slot", () => {
    for (const id of ["single", "four-h", "four-v", "six-v", "you-h"]) {
      const cell = slotCell(pieceOf(id), slots[0], 44);
      expect(cell).toBeLessThanOrEqual(44 * 0.6);
      expect(cell * pieceOf(id).width).toBeLessThan(128 - 16);
      expect(cell * pieceOf(id).height).toBeLessThan(110 - 16);
    }
  });

  it("draws a card per slot with its piece inside, and an empty card where the piece was laid", () => {
    const full = draw((ctx) => drawTray(ctx, slots, ["single", "square", "four-h"], 44, THEME, { time: 0 }));
    const one = draw((ctx) => drawTray(ctx, slots, [null, "square", null], 44, THEME, { time: 0 }));
    expect(shapes(full).length).toBeGreaterThan(shapes(one).length);
    const box = bounds(painted(full));
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(384);
    expect(box.top).toBeGreaterThanOrEqual(500);
    expect(box.bottom).toBeLessThanOrEqual(610);
  });

  it("leaves the lifted piece out of its slot while it is carried", () => {
    const carried = draw((ctx) => drawTray(ctx, slots, ["single", "square", "four-h"], 44, THEME, { time: 0, lifted: 1 }));
    const without = draw((ctx) => drawTray(ctx, slots, ["single", null, "four-h"], 44, THEME, { time: 0 }));
    expect(shapes(carried)).toEqual(shapes(without).map((one) => one));
  });

  it("rocks the last pieces gently when nothing fits", () => {
    const still = shapes(draw((ctx) => drawTray(ctx, slots, ["six-h", null, null], 44, THEME, { time: 0.3 })));
    const stuck = shapes(draw((ctx) => drawTray(ctx, slots, ["six-h", null, null], 44, THEME, { time: 0.3, stuck: true })));
    expect(stuck).not.toEqual(still);
  });
});
