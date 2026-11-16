import { describe, expect, it } from "vitest";
import { CORNER, overlap } from "../../../kit/src/canvas/layout.js";
import { SIZES, inside } from "../../../kit/test/canvas/sizes.js";
import { LIGHTS, acrossOf, playLayout, playTargets, toScreen } from "../src/layout.js";
import { TABLE } from "../src/table.js";

const framed = ({ table }) => ({ x: table.x - 7, y: table.y - 7, w: table.w + 14, h: table.h + 14 });
const withLights = ({ table }) => (table.turn ? { x: table.x - LIGHTS, y: table.y, w: table.w + 2 * LIGHTS, h: table.h } : { x: table.x, y: table.y - LIGHTS, w: table.w, h: table.h + 2 * LIGHTS });

describe("the play screen's layout", () => {
  it("keeps the bar, the table with its frame and the score lights inside the frame, apart from each other", () => {
    for (const [width, height, fill] of SIZES) {
      const layout = playLayout(width, height, { fill });
      const name = `${width}x${height}`;
      expect(inside(layout.bar, width, height), name).toBe(true);
      expect(inside(framed(layout), width, height), name).toBe(true);
      expect(inside(withLights(layout), width, height), name).toBe(true);
      expect(overlap(withLights(layout), layout.bar), name).toBe(false);
      expect(overlap(framed(layout), layout.bar), name).toBe(false);
    }
  });

  it("stands the table upright on a phone and lays it on its side when the frame is wider than tall, whichever is larger", () => {
    expect(playLayout(384, 801, { fill: true }).table.turn).toBe(false);
    expect(playLayout(384, 556, { fill: false }).table.turn).toBe(false);
    expect(playLayout(844, 338, { fill: true }).table.turn).toBe(true);
    expect(playLayout(1280, 503, { fill: false }).table.turn).toBe(true);
    for (const [width, height, fill] of SIZES) {
      const { table } = playLayout(width, height, { fill });
      expect(table.turn ? table.w : table.h, `${width}x${height}`).toBeCloseTo(table.s * TABLE.length, 6);
      expect(table.s, `${width}x${height}`).toBeGreaterThanOrEqual(150);
    }
  });

  it("maps the table to the screen and a finger back across the table, on its side too", () => {
    for (const [width, height, fill] of [[384, 801, true], [844, 338, true]]) {
      const layout = playLayout(width, height, { fill });
      const [x, y] = toScreen(layout, 0.3, TABLE.length - 0.1);
      expect(acrossOf(layout, { x, y })).toBeCloseTo(0.3, 9);
      const [nearX, nearY] = toScreen(layout, 0.5, TABLE.length);
      const [farX, farY] = toScreen(layout, 0.5, 0);
      if (layout.table.turn) expect(nearX).toBeLessThan(farX);
      else expect(nearY).toBeGreaterThan(farY);
    }
  });

  it("lets the player drag from anywhere on their own half, under the bar, and gives the far half to a second player", () => {
    for (const [width, height, fill] of SIZES) {
      const layout = playLayout(width, height, { fill });
      const [near, far] = layout.zones;
      const name = `${width}x${height}`;
      expect(overlap(near, far), name).toBe(false);
      expect(overlap(near, layout.bar), name).toBe(false);
      const [paddleX, paddleY] = toScreen(layout, 0.5, TABLE.length - TABLE.inset);
      expect(paddleX >= near.x && paddleX <= near.x + near.w && paddleY >= near.y && paddleY <= near.y + near.h, name).toBe(true);
      const [otherX, otherY] = toScreen(layout, 0.5, TABLE.inset);
      expect(otherX >= far.x && otherX <= far.x + far.w && otherY >= far.y && otherY <= far.y + far.h, name).toBe(true);
    }
  });

  it("offers pause, sound and music in the bar, big enough and apart, nothing in the bottom corners of a full screen", () => {
    for (const [width, height, fill] of SIZES) {
      const layout = playLayout(width, height, { fill });
      const targets = playTargets(layout, { volume: true });
      expect(targets.map((one) => one.kind).sort()).toEqual(["music", "pause", "speaker", "volume"]);
      for (const target of targets) {
        expect(inside(target, width, height), `${width}x${height} ${target.kind}`).toBe(true);
        expect(Math.min(target.w, target.h)).toBeGreaterThanOrEqual(48);
      }
      const buttons = targets.filter((one) => one.kind !== "volume");
      buttons.forEach((one, at) => buttons.slice(at + 1).forEach((two) => expect(overlap(one, two)).toBe(false)));
      const corners = [{ x: 0, y: height - CORNER, w: CORNER, h: CORNER }, { x: width - CORNER, y: height - CORNER, w: CORNER, h: CORNER }];
      if (fill) for (const target of targets) for (const corner of corners) expect(overlap(target, corner)).toBe(false);
    }
  });
});
