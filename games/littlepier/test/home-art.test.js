import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawLookArt, drawScene } from "../src/home-art.js";
import { THEME } from "../src/theme.js";

const { art } = THEME;

describe("the looks", () => {
  it("shows a fishing spot even on a tile as small as a tab, inside the tile", () => {
    const area = { x: 100, y: 10, w: 72, h: 72 };
    for (const place of ["pier", "boat"]) {
      const ctx = draw((pen) => drawLookArt(pen, area, "place", place, THEME, 0));
      expect(colours(ctx), place).toContain(art.days.morning.water);
      expect(ctx.depth).toBe(0);
    }
  });

  it("shows each hook charm in the middle of its tile", () => {
    const area = { x: 20, y: 20, w: 100, h: 100 };
    for (const charm of ["star", "heart", "flower"]) {
      const box = bounds(painted(draw((pen) => drawLookArt(pen, area, "charm", charm, THEME, 0))));
      expect(box.left, charm).toBeGreaterThanOrEqual(area.x);
      expect(box.right, charm).toBeLessThanOrEqual(area.x + area.w);
    }
  });
});

describe("the scene on the home screen", () => {
  it("seats the player and Flick on the pier when the band is tall enough, and leaves them out of a thin one", () => {
    const anglers = [{ player: { who: "ari" }, pose: "idle" }, { player: { who: "flick" }, pose: "idle" }];
    const tall = draw((pen) => drawScene(pen, { x: 0, y: 60, w: 384, h: 220 }, { anglers }, THEME, 0));
    const thin = draw((pen) => drawScene(pen, { x: 0, y: 60, w: 384, h: 70 }, { anglers }, THEME, 0));
    expect(colours(tall)).toContain(art.bucket.body);
    expect(colours(thin)).not.toContain(art.bucket.body);
    expect(colours(thin)).toContain(art.pier.wood);
  });
});
