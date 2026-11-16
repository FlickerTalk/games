import { describe, expect, it } from "vitest";
import { CORNER, overlap } from "../../../kit/src/canvas/layout.js";
import { SIZES, inside } from "../../../kit/test/canvas/sizes.js";
import { playLayout, playTargets, robotsBox } from "../src/layout.js";

const each = (run) => {
  for (const [width, height, fill] of SIZES) for (const pair of [false, true]) run(playLayout(width, height, { fill, pair }), `${width}x${height}${pair ? " pair" : ""}`);
};

describe("the play screen's layout", () => {
  it("keeps the bar, the batteries, the robots and the buttons inside the frame, apart from each other", () => {
    each((layout, name) => {
      const { width, height } = layout;
      const robots = robotsBox(layout);
      expect(inside(layout.bar, width, height), name).toBe(true);
      expect(inside(robots, width, height), name).toBe(true);
      expect(overlap(robots, layout.bar), name).toBe(false);
      expect(overlap(robots, layout.hud.area), name).toBe(false);
      expect(overlap(layout.hud.area, layout.bar), name).toBe(false);
      for (const button of layout.buttons) {
        expect(overlap(button, robots), `${name} ${button.kind}`).toBe(false);
        expect(overlap(button, layout.hud.area), `${name} ${button.kind}`).toBe(false);
        expect(overlap(button, layout.bar), `${name} ${button.kind}`).toBe(false);
      }
    });
  });

  it("gives one player the glove at the left edge and the boot at the right, and two players a glove and a boot each at their own side", () => {
    each((layout, name) => {
      const { width, pair } = layout;
      expect(layout.buttons.map((one) => `${one.kind}${one.value}`).sort(), name).toEqual(pair ? ["boot0", "boot1", "glove0", "glove1"] : ["boot0", "glove0"]);
      const at = (kind, seat) => layout.buttons.find((one) => one.kind === kind && one.value === seat);
      if (!pair) {
        expect(at("glove", 0).x + at("glove", 0).w, name).toBeLessThanOrEqual(width / 2);
        expect(at("boot", 0).x, name).toBeGreaterThanOrEqual(width / 2);
        return;
      }
      for (const kind of ["glove", "boot"]) {
        expect(at(kind, 0).x + at(kind, 0).w, name).toBeLessThanOrEqual(width / 2);
        expect(at(kind, 1).x, name).toBeGreaterThanOrEqual(width / 2);
      }
    });
  });

  it("makes every button 88 px or more, 120 px on a phone held upright, apart, and out of the bottom corners of a full screen", () => {
    each((layout, name) => {
      const { width, height, fill, buttons } = layout;
      const corners = [{ x: 0, y: height - CORNER, w: CORNER, h: CORNER }, { x: width - CORNER, y: height - CORNER, w: CORNER, h: CORNER }];
      for (const button of buttons) {
        expect(inside(button, width, height), name).toBe(true);
        expect(Math.min(button.w, button.h), name).toBeGreaterThanOrEqual(88);
        if (fill) for (const corner of corners) expect(overlap(button, corner), name).toBe(false);
      }
      buttons.forEach((one, at) => buttons.slice(at + 1).forEach((two) => expect(overlap(one, two), name).toBe(false)));
    });
    for (const [width, height] of [[384, 801], [430, 880], [360, 588]]) {
      for (const button of playLayout(width, height, { fill: true }).buttons) expect(button.w).toBe(120);
    }
  });

  it("keeps the robots large enough to read, facing each other with room to step in", () => {
    each((layout, name) => {
      expect(layout.size, name).toBeGreaterThanOrEqual(layout.pair ? 48 : 60);
      expect(layout.home[1] - layout.home[0], name).toBeGreaterThan(layout.meet[1] - layout.meet[0]);
      expect(layout.meet[1] - layout.meet[0], name).toBeGreaterThanOrEqual(layout.size);
      expect((layout.home[0] + layout.home[1]) / 2, name).toBeCloseTo(layout.width / 2, 6);
    });
    expect(playLayout(384, 801, { fill: true }).size).toBeGreaterThanOrEqual(130);
  });

  it("shows each side's lamps and batteries at its own top corner with the window's dial between them", () => {
    each((layout, name) => {
      const { hud, width } = layout;
      expect(hud.sides[0].x, name).toBeLessThan(width / 2);
      expect(hud.sides[1].x, name).toBeGreaterThan(width / 2);
      expect(hud.sides[1].direction, name).toBe(-1);
      expect(hud.dial.r * 2, name).toBeGreaterThanOrEqual(36);
      const reach = hud.sides[0].x + 139 * hud.scale;
      expect(reach, name).toBeLessThanOrEqual(hud.dial.x - hud.dial.r);
    });
  });

  it("offers pause, sound and music in the bar and the game's buttons under it, with the volume line when it is open", () => {
    each((layout, name) => {
      const targets = playTargets(layout, { volume: true });
      const kinds = targets.map((one) => one.kind);
      expect(kinds, name).toEqual(expect.arrayContaining(["volume", "pause", "speaker", "music", "glove", "boot"]));
      for (const target of targets.filter((one) => ["pause", "speaker", "music"].includes(one.kind))) {
        expect(inside(target, layout.width, layout.height), name).toBe(true);
        expect(Math.min(target.w, target.h), name).toBeGreaterThanOrEqual(48);
      }
      expect(playTargets(layout).map((one) => one.kind), name).not.toContain("volume");
    });
  });
});
