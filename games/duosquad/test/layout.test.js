import { describe, expect, it } from "vitest";
import { overlap } from "../../../kit/src/canvas/layout.js";
import { SIZES, checkTargets, inside } from "../../../kit/test/canvas/sizes.js";
import { CRAFT_V } from "../src/crafts.js";
import { fromScreen, metricsOf, playLayout, playTargets, toScreen } from "../src/layout.js";

const each = (run) => SIZES.forEach(([width, height, fill]) => run(playLayout(width, height, { fill }), `${width}x${height}`, { width, height, fill }));

describe("the play screen's layout", () => {
  it("keeps the bar and the field inside the frame, the field under the bar", () => {
    each((layout, name, { width, height }) => {
      expect(inside(layout.bar, width, height), name).toBe(true);
      expect(inside(layout.field, width, height), name).toBe(true);
      expect(overlap(layout.field, layout.bar), name).toBe(false);
      expect(layout.field.h, name).toBeGreaterThanOrEqual(220);
      expect(layout.field.w, name).toBeLessThanOrEqual(640);
    });
  });

  it("makes the crafts large enough for a face in the cockpit and keeps them whole above the bottom edge", () => {
    each((layout, name) => {
      const { field, craft } = layout;
      expect(craft, name).toBeGreaterThanOrEqual(56);
      expect(craft, name).toBeLessThanOrEqual(96);
      const [, y] = toScreen(layout, 0.5, CRAFT_V);
      expect(y + craft / 2, name).toBeLessThanOrEqual(field.y + field.h + 0.5);
      expect(metricsOf(layout)).toEqual({ w: field.w, h: field.h, unit: layout.unit, craft });
    });
  });

  it("runs the time ribbon along the bar, clear of the buttons, with room for the team's two parts on a tall screen", () => {
    each((layout, name, { height }) => {
      const { ribbon, bar } = layout;
      expect(ribbon.w, name).toBeGreaterThanOrEqual(80);
      expect(ribbon.x, name).toBeGreaterThanOrEqual(bar.x);
      expect(ribbon.x + ribbon.w, name).toBeLessThanOrEqual(bar.x + bar.w);
      expect(ribbon.y + ribbon.h, name).toBeLessThanOrEqual(bar.y + bar.h);
      expect(Boolean(layout.me), name).toBe(height >= 600);
      if (layout.me) expect(layout.me.x + layout.me.size / 2 + 50, name).toBeLessThanOrEqual(ribbon.x);
    });
  });

  it("turns field places into pixels and back", () => {
    const layout = playLayout(384, 801, { fill: true });
    const [x, y] = toScreen(layout, 0.25, 0.5);
    expect(fromScreen(layout, { x, y })).toEqual({ u: 0.25, v: 0.5 });
  });

  it("has pause and the two sound buttons to touch, large enough, apart and out of the bottom corners", () => {
    each((layout, name, size) => {
      const targets = playTargets(layout);
      expect(targets.map((one) => one.kind)).toEqual(["pause", "speaker", "music"]);
      checkTargets(targets, { ...size, name, least: () => 48 });
      expect(playTargets(layout, { volume: true })[0].kind).toBe("volume");
    });
  });
});
