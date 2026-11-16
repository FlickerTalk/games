import { describe, expect, it } from "vitest";
import { CORNER, overlap, within } from "../../../kit/src/canvas/layout.js";
import { SIZES, inside } from "../../../kit/test/canvas/sizes.js";
import { BALLOON_LIFT, SIGNAL_REACH, playLayout, playTargets, seatAt } from "../src/layout.js";

const each = (run) => {
  for (const pair of [false, true]) SIZES.forEach(([width, height, fill]) => run(playLayout(width, height, { fill, pair }), `${width}x${height}${pair ? " pair" : ""}`, { width, height, fill, pair }));
};
const bodyOf = ({ x, y }, size) => ({ x: x - size * 0.3, y: y - size * 1.2, w: size * 0.6, h: size * 1.2 });

describe("the play screen's layout", () => {
  it("keeps the bar and the yard inside the frame, the yard under the bar", () => {
    each((layout, name, { width, height }) => {
      expect(inside(layout.bar, width, height), name).toBe(true);
      expect(inside(layout.stage, width, height), name).toBe(true);
      expect(overlap(layout.stage, layout.bar), name).toBe(false);
      expect(layout.ribbon.w, name).toBeGreaterThanOrEqual(120);
      expect(layout.ribbon.y + layout.ribbon.h, name).toBeLessThanOrEqual(layout.bar.y + layout.bar.h);
    });
  });

  it("stands the two knights on the ground facing each other, the player's on the left, never tiny", () => {
    each((layout, name) => {
      const { stage, knights, size, ground } = layout;
      expect(size, name).toBeGreaterThanOrEqual(64);
      expect(size, name).toBeLessThanOrEqual(158);
      expect(knights[0].x, name).toBeLessThan(knights[1].x);
      expect(knights[1].x - knights[0].x, name).toBeGreaterThanOrEqual(size * 0.9);
      for (const knight of knights) {
        expect(knight.y, name).toBe(ground);
        expect(knight.x - size * 0.45, name).toBeGreaterThanOrEqual(stage.x);
        expect(knight.x + size * 0.45, name).toBeLessThanOrEqual(stage.x + stage.w);
        expect(ground - size * (BALLOON_LIFT + 0.25), name).toBeGreaterThanOrEqual(stage.y);
      }
      expect(ground, name).toBeLessThanOrEqual(stage.y + stage.h);
    });
  });

  it("is the approved picture on a phone held upright: knights of about 140 px a quarter in from each side", () => {
    const layout = playLayout(384, 801, { fill: true });
    expect(layout.size).toBeGreaterThanOrEqual(122);
    expect(layout.knights[0].x / 384).toBeCloseTo(0.24, 1);
    expect(layout.knights[1].x / 384).toBeCloseTo(0.76, 1);
    expect(layout.pads).toHaveLength(1);
    expect(layout.pads[0].w).toBe(136);
    expect(layout.pads[0].x + layout.pads[0].w / 2).toBe(192);
  });

  it("opens the signal between the knights, over their heads and inside the yard", () => {
    each((layout, name) => {
      const { signal, stage, knights, size, ground } = layout;
      expect(signal.size, name).toBeGreaterThanOrEqual(44);
      expect(signal.x, name).toBeCloseTo((knights[0].x + knights[1].x) / 2, 6);
      expect(signal.y - signal.size * SIGNAL_REACH, name).toBeGreaterThanOrEqual(stage.y - 0.5);
      expect(signal.y + signal.size * 0.3, name).toBeLessThanOrEqual(ground - size * 0.9);
    });
  });

  it("gives each player on the phone a pad of 120 px or more that covers no knight, and their side of the yard to tap", () => {
    each((layout, name, { width, height, fill, pair }) => {
      const { pads, zones, stage, knights, size } = layout;
      expect(pads, name).toHaveLength(pair ? 2 : 1);
      expect(zones, name).toHaveLength(pads.length);
      const corners = [{ x: 0, y: height - CORNER, w: CORNER, h: CORNER }, { x: width - CORNER, y: height - CORNER, w: CORNER, h: CORNER }];
      pads.forEach((pad, seat) => {
        expect(Math.min(pad.w, pad.h), name).toBeGreaterThanOrEqual(120);
        expect(inside(pad, width, height), name).toBe(true);
        expect(pad.y, name).toBeGreaterThanOrEqual(stage.y);
        for (const knight of knights) expect(overlap(pad, bodyOf(knight, size)), name).toBe(false);
        if (fill) for (const corner of corners) expect(overlap(pad, corner), name).toBe(false);
        expect(within(zones[seat], { x: pad.x + pad.w / 2, y: pad.y + pad.h / 2 }), name).toBe(true);
      });
      if (pair) {
        expect(overlap(pads[0], pads[1]), name).toBe(false);
        expect(overlap(zones[0], zones[1]), name).toBe(false);
        expect(pads[0].x, name).toBeLessThan(pads[1].x);
      }
    });
  });

  it("tells whose side a finger is on: anywhere in the yard for one player, each half for two", () => {
    const one = playLayout(384, 801, { fill: true });
    expect(seatAt(one, { x: 30, y: 300 })).toBe(0);
    expect(seatAt(one, { x: 350, y: 700 })).toBe(0);
    expect(seatAt(one, { x: 190, y: 30 })).toBeNull();
    const two = playLayout(384, 801, { fill: true, pair: true });
    expect(seatAt(two, { x: 30, y: 300 })).toBe(0);
    expect(seatAt(two, { x: 350, y: 700 })).toBe(1);
  });

  it("offers the pads, pause, sound and music, apart from each other", () => {
    each((layout, name, { pair }) => {
      const targets = playTargets(layout, { volume: true });
      expect(targets.map((one) => one.kind).sort(), name).toEqual([...(pair ? ["strike", "strike"] : ["strike"]), "music", "pause", "speaker", "volume"].sort());
      expect(targets.filter((one) => one.kind === "strike").map((one) => one.value)).toEqual(pair ? [0, 1] : [0]);
      const buttons = targets.filter((one) => one.kind !== "volume");
      buttons.forEach((one, at) => buttons.slice(at + 1).forEach((two) => expect(overlap(one, two), `${name} ${one.kind} ${two.kind}`).toBe(false)));
    });
  });
});
