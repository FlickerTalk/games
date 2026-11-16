import { describe, expect, it } from "vitest";
import { MIN_CLEARANCE, PAGE_H, PAGE_W, contains, outline, required, zoneAt, zonesOf } from "../src/geometry.js";

const square = { k: "p", v: [0, 0, 100, 0, 100, 100, 0, 100], s: 0 };
const ball = { k: "e", v: [50, 50, 20, 20], s: 1 };
const card = { k: "r", v: [150, 150, 60, 40, 8], s: 2 };
const leaf = { k: "d", v: [["M", 200, 20], ["Q", 260, 0, 280, 60], ["Q", 220, 80, 200, 20], ["Z"]], s: 3 };
const twins = { k: "d", v: [["M", 10, 200], ["L", 40, 200], ["L", 40, 230], ["Z"], ["M", 60, 200], ["L", 90, 200], ["L", 90, 230], ["Z"]], s: 4 };
const dot = { k: "e", v: [120, 300, 2, 2], s: 5 };
const page = { id: "test", regions: [square, ball, card, leaf, twins, dot] };

describe("a page's zones", () => {
  it("are drawn on a page of 300 by 360", () => {
    expect([PAGE_W, PAGE_H]).toEqual([300, 360]);
  });

  it("know whether a point is inside each kind of shape", () => {
    expect(contains(square, 10, 10)).toBe(true);
    expect(contains(square, 110, 10)).toBe(false);
    expect(contains(ball, 50, 69)).toBe(true);
    expect(contains(ball, 50, 72)).toBe(false);
    expect(contains(card, 152, 170)).toBe(true);
    expect(contains(card, 151, 151)).toBe(false);
    expect(contains(card, 215, 151)).toBe(false);
    expect(contains(leaf, 240, 30)).toBe(true);
    expect(contains(leaf, 205, 60)).toBe(false);
    expect(contains(twins, 35, 205)).toBe(true);
    expect(contains(twins, 85, 205)).toBe(true);
    expect(contains(twins, 50, 205)).toBe(false);
  });

  it("flatten their curves into closed outlines, one per part", () => {
    expect(outline(twins)).toHaveLength(2);
    expect(outline(leaf)[0].length).toBeGreaterThan(8);
    expect(outline(ball)[0].length).toBeGreaterThanOrEqual(24);
  });

  it("answer a touch with the zone drawn on top", () => {
    expect(zoneAt(page, 50, 50)).toBe(1);
    expect(zoneAt(page, 5, 5)).toBe(0);
    expect(zoneAt(page, 240, 30)).toBe(3);
    expect(zoneAt(page, 290, 350)).toBe(-1);
    expect(zoneAt(page, -5, 10)).toBe(-1);
  });

  it("find for each zone a point a finger can reach, inside it and clear of the zones above it", () => {
    const zones = zonesOf(page);
    expect(zones).toHaveLength(6);
    zones.forEach((zone, at) => {
      if (zone.clearance === 0) return;
      expect(zoneAt(page, ...zone.anchor), `zone ${at}`).toBe(at);
    });
    expect(zones[0].clearance).toBeGreaterThan(20);
    expect(zones[1].clearance).toBeGreaterThan(15);
    expect(zones[5].clearance).toBeLessThan(MIN_CLEARANCE);
  });

  it("ask a child to fill only the zones wide enough for a finger", () => {
    expect(required(page)).toEqual([0, 1, 2, 3, 4]);
  });

  it("are worked out once per page", () => {
    expect(zonesOf(page)).toBe(zonesOf(page));
  });
});
