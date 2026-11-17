import { describe, expect, it } from "vitest";
import { CORNER, overlap } from "../../../kit/src/canvas/layout.js";
import { SIZES, inside } from "../../../kit/test/canvas/sizes.js";
import { fromScreen, playLayout, playTargets, sizeOf, toScreen } from "../src/layout.js";

const each = (run) => SIZES.forEach(([width, height, fill]) => run(playLayout(width, height, { fill, rival: true }), `${width}x${height}`, { width, height, fill }));

describe("the play screen's layout", () => {
  it("keeps the bar and the stall inside the frame, the stall under the bar", () => {
    each((layout, name, { width, height }) => {
      expect(inside(layout.bar, width, height), name).toBe(true);
      expect(inside(layout.stage, width, height), name).toBe(true);
      expect(overlap(layout.stage, layout.bar), name).toBe(false);
    });
  });

  it("runs the time ribbon along the bar, under the scores and clear of the buttons", () => {
    each((layout, name) => {
      const { ribbon, bar, controls } = layout;
      expect(ribbon.w, name).toBeGreaterThanOrEqual(120);
      expect(ribbon.x, name).toBeGreaterThanOrEqual(bar.x);
      expect(ribbon.x + ribbon.w, name).toBeLessThanOrEqual(bar.x + bar.w);
      expect(ribbon.y + ribbon.h, name).toBeLessThanOrEqual(bar.y + bar.h);
      const button = Math.min(layout.row - 12, 44);
      const under = controls.pause.y + controls.pause.h / 2 + button / 2;
      expect(ribbon.y, name).toBeGreaterThanOrEqual(under);
    });
  });

  it("gives the balloons a field between the awning and the counter, with the toy on the counter", () => {
    each((layout, name) => {
      const { field, stage, tool, awning, counter } = layout;
      expect(field.y, name).toBeGreaterThan(stage.y);
      expect(field.y + field.h, name).toBeCloseTo(stage.y + stage.h - counter, 6);
      expect(field.h, name).toBeGreaterThanOrEqual(150);
      expect(awning, name).toBeGreaterThanOrEqual(24);
      expect(tool.y, name).toBeGreaterThan(field.y + field.h);
      expect(tool.y + tool.size / 2, name).toBeLessThanOrEqual(stage.y + stage.h + 0.5);
      expect(tool.size, name).toBeGreaterThanOrEqual(56);
      expect(tool.size, name).toBeLessThanOrEqual(122);
    });
  });

  it("sizes the balloons to the field, never tiny in the smallest room and as approved on a phone", () => {
    each((layout, name) => {
      expect(sizeOf(layout, "round"), name).toBeGreaterThanOrEqual(38);
      expect(sizeOf(layout, "round"), name).toBeLessThanOrEqual(110);
      expect(sizeOf(layout, "big"), name).toBeGreaterThan(sizeOf(layout, "round"));
    });
    const phone = playLayout(384, 801, { fill: true });
    expect(sizeOf(phone, "round")).toBeGreaterThanOrEqual(64);
    expect(sizeOf(phone, "round")).toBeLessThanOrEqual(74);
  });

  it("maps the field to the screen and a finger back to the field", () => {
    each((layout, name) => {
      const [x, y] = toScreen(layout, 0.3, 0.8);
      expect(fromScreen(layout, { x, y }), name).toEqual({ u: expect.closeTo(0.3, 9), v: expect.closeTo(0.8, 9) });
      expect(toScreen(layout, 0.5, 1)[1], name).toBeGreaterThan(toScreen(layout, 0.5, 0)[1]);
    });
  });

  it("offers pause, sound and music in the bar, big enough and apart, nothing in the bottom corners of a full screen", () => {
    each((layout, name, { width, height, fill }) => {
      const targets = playTargets(layout, { volume: true });
      expect(targets.map((one) => one.kind).sort()).toEqual(["music", "pause", "speaker", "volume"]);
      for (const target of targets) {
        expect(inside(target, width, height), `${name} ${target.kind}`).toBe(true);
        expect(Math.min(target.w, target.h)).toBeGreaterThanOrEqual(48);
      }
      const buttons = targets.filter((one) => one.kind !== "volume");
      buttons.forEach((one, at) => buttons.slice(at + 1).forEach((two) => expect(overlap(one, two)).toBe(false)));
      const corners = [{ x: 0, y: height - CORNER, w: CORNER, h: CORNER }, { x: width - CORNER, y: height - CORNER, w: CORNER, h: CORNER }];
      if (fill) for (const target of targets) for (const corner of corners) expect(overlap(target, corner)).toBe(false);
    });
  });

  it("leaves the pause out of the bar of a round with a friend, sound and music where they were", () => {
    for (const [width, height, fill] of SIZES) {
      const layout = playLayout(width, height, { fill, rival: true, pause: false });
      expect(layout.controls.pause).toBeNull();
      expect(playTargets(layout).some((one) => one.kind === "pause")).toBe(false);
      expect(layout.controls.speaker).toEqual(playLayout(width, height, { fill, rival: true }).controls.speaker);
    }
  });
});
