import { describe, expect, it } from "vitest";
import { bounds, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { TANKS, drawTank } from "../src/tanks.js";
import { THEME } from "../src/theme.js";

const art = THEME.art;
const tank = (options = {}, size = 80) => draw((ctx) => drawTank(ctx, 100, 200, size, art, options));

describe("the toy tanks", () => {
  it("are six with their own silhouettes, two of them wrapped gifts", () => {
    expect(TANKS.map((one) => one.id)).toEqual(["round", "long", "tall", "balloon", "snail", "wooden"]);
    const outlines = TANKS.map((one) => shapes(tank({ variant: one.id })).join("|"));
    expect(new Set(outlines).size).toBe(6);
  });

  it("stand on the point they are given, about as wide as their size, and leave the context as they found it", () => {
    for (const { id } of TANKS) {
      const ctx = tank({ variant: id });
      const box = bounds(painted(ctx));
      expect(ctx.depth, id).toBe(0);
      expect(box.bottom, id).toBeLessThanOrEqual(206);
      expect(box.bottom, id).toBeGreaterThan(185);
      expect(box.right - box.left, id).toBeLessThan(80 * 1.4);
      expect(box.top, id).toBeGreaterThan(200 - 80 * 1.25);
    }
  });

  it("turn the barrel with the angle and towards the side they face, and pull it back when they fire", () => {
    const up = bounds(painted(tank({ angle: 1.3 })));
    const flat = bounds(painted(tank({ angle: 0.2 })));
    expect(up.top).toBeLessThan(flat.top);
    const left = bounds(painted(tank({ angle: 0.2, direction: -1 })));
    expect(left.left).toBeLessThan(flat.left);
    expect(shapes(tank({ recoil: 1 }))).not.toEqual(shapes(tank({ recoil: 0 })));
  });

  it("wear one, two or three coats of the other side's paint, look dizzy at three, and wipe their eyes", () => {
    const counts = [0, 1, 2, 3].map((level) => tank({ hitLevel: level }).calls.length);
    expect(counts[1]).toBeGreaterThan(counts[0]);
    expect(counts[2]).toBeGreaterThan(counts[1]);
    expect(counts[3]).toBeGreaterThan(counts[2]);
    expect(tank({ wiping: true, time: 0.3 }).calls.length).toBeGreaterThan(tank({ time: 0.3 }).calls.length);
  });

  it("show the player's circle or the rival's diamond, so the two sides differ by shape too", () => {
    expect(shapes(tank({ team: 0 }))).not.toEqual(shapes(tank({ team: 1, direction: 1 })));
  });
});
