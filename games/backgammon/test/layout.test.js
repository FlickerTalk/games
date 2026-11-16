import { describe, expect, it } from "vitest";
import { barBox, barSpot, diceSpots, layoutFor, pipsAt, pointBox, stackSpot, trayBox, traySpot } from "../src/layout.js";

const SIZES = [200, 300, 320, 343, 352, 384, 480, 720];
const inside = (box, area) => box.x >= area.x - 1e-6 && box.y >= area.y - 1e-6 && box.x + box.w <= area.x + area.w + 1e-6 && box.y + box.h <= area.y + area.h + 1e-6;
const overlap = (one, two) => one.x < two.x + two.w - 1e-6 && two.x < one.x + one.w - 1e-6 && one.y < two.y + two.h - 1e-6 && two.y < one.y + one.h - 1e-6;
const centre = (box) => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 });

describe("the backgammon table's layout", () => {
  it("fits the table and, under it, the dock for the dice inside the square at every size", () => {
    for (const size of SIZES) {
      const layout = layoutFor(size);
      const whole = { x: 0, y: 0, w: size, h: size };
      expect(inside(layout.table, whole), `${size}`).toBe(true);
      expect(inside(layout.dock, whole), `${size}`).toBe(true);
      expect(layout.dock.y, `${size}`).toBeGreaterThan(layout.table.y + layout.table.h);
      expect(inside(layout.field, layout.table), `${size}`).toBe(true);
      expect(inside(layout.tray, layout.table), `${size}`).toBe(true);
      expect(layout.table.w / layout.table.h, `${size}`).toBeGreaterThan(1);
    }
  });

  it("lays the twenty-four points out in two rows of twelve split by the bar, the user's home at the bottom right and the trays beyond it", () => {
    const layout = layoutFor(352);
    const at = (point) => centre(pointBox(layout, point));
    expect(at(0).y).toBeGreaterThan(at(23).y);
    for (let point = 1; point < 12; point += 1) expect(at(point).x).toBeLessThan(at(point - 1).x);
    for (let point = 13; point < 24; point += 1) expect(at(point).x).toBeGreaterThan(at(point - 1).x);
    expect(at(11).x).toBeCloseTo(at(12).x, 6);
    expect(at(6).x).toBeLessThan(layout.bar.x);
    expect(at(5).x).toBeGreaterThan(layout.bar.x + layout.bar.w);
    expect(layout.tray.x).toBeGreaterThanOrEqual(at(0).x);
  });

  it("turns the points for the side that moves the other way round, so each player's home is at their bottom right", () => {
    const layout = layoutFor(352);
    const straight = (point) => centre(pointBox(layout, point));
    const turned = (point) => centre(pointBox(layout, point, { mirrored: true }));
    for (let point = 0; point < 24; point += 1) {
      expect(turned(point).x).toBeCloseTo(straight(23 - point).x, 6);
      expect(turned(point).y).toBeCloseTo(straight(23 - point).y, 6);
    }
    expect(turned(23).y).toBeGreaterThan(turned(0).y);
  });

  it("gives every point a touch column as wide as the point and half the table high, none overlapping", () => {
    for (const size of SIZES) {
      const layout = layoutFor(size);
      const boxes = Array.from({ length: 24 }, (_, point) => pointBox(layout, point));
      for (const box of boxes) {
        expect(box.w).toBeCloseTo(layout.pointWidth, 6);
        expect(box.h).toBeCloseTo(layout.field.h / 2, 6);
        expect(inside(box, layout.table)).toBe(true);
      }
      for (const [at, box] of boxes.entries()) for (const other of boxes.slice(at + 1)) expect(overlap(box, other)).toBe(false);
      for (const box of [barBox(layout, true), barBox(layout, false), trayBox(layout, true), trayBox(layout, false)]) {
        expect(inside(box, layout.table)).toBe(true);
        for (const point of boxes) expect(overlap(box, point)).toBe(false);
      }
    }
  });

  it("stacks checkers from the edge toward the middle, squeezing a tall stack so it never crosses the middle", () => {
    const layout = layoutFor(352);
    const middle = layout.field.y + layout.field.h / 2;
    const [first, second] = [stackSpot(layout, 3, 0, 2), stackSpot(layout, 3, 1, 2)];
    expect(first.y).toBeCloseTo(layout.field.y + layout.field.h - layout.radius, 6);
    expect(second.y).toBeLessThan(first.y);
    expect(first.r).toBe(layout.radius);
    expect(stackSpot(layout, 20, 0, 1).y).toBeCloseTo(layout.field.y + layout.radius, 6);
    for (const point of [3, 20]) {
      const last = stackSpot(layout, point, 14, 15);
      expect(Math.abs(last.y - middle)).toBeGreaterThan(layout.radius);
      expect(Math.abs(stackSpot(layout, point, 13, 15).y - last.y)).toBeLessThan(Math.abs(first.y - second.y));
    }
    expect(stackSpot(layout, 3, 0, 1).x).toBeCloseTo(centre(pointBox(layout, 3)).x, 6);
  });

  it("keeps the user's checkers on the bar below its middle and the other side's above, and the trays the same way", () => {
    const layout = layoutFor(352);
    const middle = layout.field.y + layout.field.h / 2;
    expect(barSpot(layout, true, 0, 1).y).toBeGreaterThan(middle);
    expect(barSpot(layout, false, 0, 1).y).toBeLessThan(middle);
    expect(barSpot(layout, true, 1, 2).y).toBeGreaterThan(barSpot(layout, true, 0, 2).y);
    expect(barSpot(layout, true, 0, 1).x).toBeCloseTo(layout.bar.x + layout.bar.w / 2, 6);
    expect(barSpot(layout, true, 3, 4).y).toBeLessThan(layout.field.y + layout.field.h);
    expect(traySpot(layout, true, 0, 1).y).toBeGreaterThan(middle);
    expect(traySpot(layout, false, 0, 1).y).toBeLessThan(middle);
    expect(barBox(layout, true).y).toBeCloseTo(middle, 6);
    expect(trayBox(layout, false).y + trayBox(layout, false).h).toBeCloseTo(middle, 6);
  });

  it("puts two dice, or four for doubles, in the middle of the dock and the pip counts at its ends, the digits large enough to read", () => {
    for (const size of SIZES.filter((one) => one >= 300)) {
      const layout = layoutFor(size);
      for (const count of [2, 4]) {
        const dice = diceSpots(layout, count);
        expect(dice).toHaveLength(count);
        for (const die of dice) expect(inside({ x: die.x - die.size / 2, y: die.y - die.size / 2, w: die.size, h: die.size }, layout.dock)).toBe(true);
        expect(dice[0].size, `${size}`).toBeGreaterThanOrEqual(24);
      }
      const [mine, theirs] = pipsAt(layout);
      expect(mine.x + mine.width).toBeLessThan(diceSpots(layout, 4)[0].x - diceSpots(layout, 4)[0].size / 2);
      expect(theirs.x - theirs.width).toBeGreaterThan(diceSpots(layout, 4)[3].x + diceSpots(layout, 4)[3].size / 2);
      expect(mine.size, `${size}`).toBeGreaterThanOrEqual(20);
    }
  });

  it("is worked out once per size", () => {
    expect(layoutFor(352)).toBe(layoutFor(352));
    expect(Object.isFrozen(layoutFor(352))).toBe(true);
  });
});
