import { describe, expect, it } from "vitest";
import { bounds, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { SHIPS, drawShip } from "../src/ships.js";
import { THEME } from "../src/theme.js";

const art = THEME.art;
const ship = (options = {}) => draw((ctx) => drawShip(ctx, 100, 200, 80, art, options));

describe("the toy ships", () => {
  it("are six with their own silhouettes, two of them wrapped gifts, floating on the waterline they are given", () => {
    expect(SHIPS.map((one) => one.id)).toEqual(["tug", "sail", "paddle", "duck", "bathtub", "submarine"]);
    expect(new Set(SHIPS.map((one) => shapes(ship({ variant: one.id, idle: false })).join("|"))).size).toBe(6);
    for (const { id } of SHIPS) {
      const ctx = ship({ variant: id, idle: false });
      const box = bounds(painted(ctx));
      expect(ctx.depth, id).toBe(0);
      expect(box.bottom, id).toBeLessThan(200 + 80 * 0.35);
      expect(box.top, id).toBeGreaterThan(200 - 80 * 1.2);
    }
  });

  it("rock on the waves, coat with paint a level at a time, blow a bubble at three and mop it off", () => {
    expect(shapes(ship({ time: 0.4 }))).not.toEqual(shapes(ship({ time: 1.3 })));
    const counts = [0, 1, 2, 3].map((level) => ship({ hitLevel: level, idle: false }).calls.length);
    expect(counts[3]).toBeGreaterThan(counts[2]);
    expect(counts[2]).toBeGreaterThan(counts[1]);
    expect(counts[1]).toBeGreaterThan(counts[0]);
    expect(ship({ wiping: true, idle: false }).calls.length).toBeGreaterThan(ship({ idle: false }).calls.length);
  });
});
