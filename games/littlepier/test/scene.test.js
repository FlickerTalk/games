import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { drawBoat, drawFloor, drawPier, drawSky, drawWater, sunAt } from "../src/scene.js";
import { THEME } from "../src/theme.js";

const SKY = Object.freeze({ x: 0, y: 108, w: 384, h: 116 });
const WATER = Object.freeze({ x: 0, y: 224, w: 384, h: 577 });

describe("the sky", () => {
  it("keeps the sun in the middle of the sky, clear of the bar and its buttons, sinking as the round goes", () => {
    const start = sunAt(SKY, 0);
    const middle = sunAt(SKY, 0.5);
    const end = sunAt(SKY, 1);
    for (const sun of [start, middle, end]) {
      expect(sun.x).toBe(192);
      expect(sun.y - sun.r).toBeGreaterThanOrEqual(SKY.y);
      expect(sun.y).toBeLessThanOrEqual(SKY.y + SKY.h);
    }
    expect(middle.y).toBeGreaterThan(start.y);
    expect(end.y).toBeGreaterThan(middle.y);
    expect(sunAt(SKY, 3)).toEqual(end);
  });

  it("is drawn inside its band, a sun by day and a moon with stars at night", () => {
    for (const day of ["morning", "sunset", "night"]) {
      const ctx = draw((pen) => drawSky(pen, SKY, day, THEME, { time: 2, share: 0.3 }));
      const box = bounds(painted(ctx));
      expect(box.top, day).toBeGreaterThanOrEqual(SKY.y - 1);
      expect(box.bottom, day).toBeLessThanOrEqual(SKY.y + SKY.h + 1);
      expect(colours(ctx), day).toContain(THEME.art.days[day].sky);
      expect(colours(ctx), day).toContain(THEME.art.days[day].sun);
    }
    const night = draw((pen) => drawSky(pen, SKY, "night", THEME, { time: 2, share: 0.3 }));
    const morning = draw((pen) => drawSky(pen, SKY, "morning", THEME, { time: 2, share: 0.3 }));
    expect(night.calls.length).toBeGreaterThan(morning.calls.length);
  });
});

describe("the water", () => {
  it("fills its box, with slow light bands that drift and a line at the surface", () => {
    const one = draw((pen) => drawWater(pen, WATER, "morning", THEME, 0));
    const two = draw((pen) => drawWater(pen, WATER, "morning", THEME, 3));
    const box = bounds(painted(one));
    expect(box.top).toBeGreaterThanOrEqual(WATER.y - 8);
    expect(box.bottom).toBeLessThanOrEqual(WATER.y + WATER.h);
    expect(colours(one)).toContain(THEME.art.days.morning.water);
    expect(colours(one)).toContain(THEME.art.days.morning.deep);
    expect(shapes(one)).not.toEqual(shapes(two));
  });

  it("has a sandy floor with swaying weed inside its own strip", () => {
    const floor = { x: 0, y: 756, w: 384, h: 45 };
    const ctx = draw((pen) => drawFloor(pen, floor, "sunset", THEME, 1));
    const box = bounds(painted(ctx));
    expect(box.top).toBeGreaterThanOrEqual(floor.y - 22);
    expect(box.bottom).toBeLessThanOrEqual(floor.y + floor.h);
    expect(colours(ctx)).toContain(THEME.art.days.sunset.sand);
    expect(colours(ctx)).toContain(THEME.art.days.sunset.leaf);
  });
});

describe("where the anglers sit", () => {
  it("is a wooden pier across the water on posts", () => {
    const pier = { x: 10, y: 210, w: 364, deck: 24, posts: 70 };
    const ctx = draw((pen) => drawPier(pen, pier, THEME));
    const box = bounds(painted(ctx));
    expect(box.left).toBeGreaterThanOrEqual(10);
    expect(box.right).toBeLessThanOrEqual(374);
    expect(box.top).toBeGreaterThanOrEqual(209);
    expect(box.bottom).toBeLessThanOrEqual(210 + 70 + 1);
    expect(colours(ctx)).toContain(THEME.art.pier.wood);
  });

  it("or a boat bobbing on the water", () => {
    const one = draw((pen) => drawBoat(pen, 192, 224, 280, THEME, 0));
    const two = draw((pen) => drawBoat(pen, 192, 224, 280, THEME, 1));
    expect(colours(one)).toContain(THEME.art.boat.hull);
    const box = bounds(painted(one));
    expect(box.left).toBeGreaterThanOrEqual(192 - 280 * 0.55);
    expect(box.right).toBeLessThanOrEqual(192 + 280 * 0.55);
    expect(shapes(one)).not.toEqual(shapes(two));
  });
});
