import { describe, expect, it } from "vitest";
import { overlap, within } from "../../../kit/src/canvas/layout.js";
import { SIZES, checkTargets, inside } from "../../../kit/test/canvas/sizes.js";
import { FIGURE, footOf, playLayout, playTargets, seatAt, sceneBox } from "../src/layout.js";

describe("the play screen's layout", () => {
  it("keeps the bar and the whole scene, heads and the platform's side included, inside the frame and apart, at every size, for one player and two", () => {
    for (const [width, height, fill] of SIZES) {
      for (const pair of [false, true]) {
        const layout = playLayout(width, height, { fill, pair });
        const name = `${width}x${height}${pair ? " pair" : ""}`;
        expect(inside(layout.bar, width, height), name).toBe(true);
        expect(inside(sceneBox(layout), width, height), name).toBe(true);
        expect(overlap(sceneBox(layout), layout.bar), name).toBe(false);
        expect(layout.platform.r, name).toBeGreaterThanOrEqual(pair ? 36 : 60);
        for (const dash of layout.dash) expect(overlap(dash, sceneBox(layout)), name).toBe(false);
      }
    }
  });

  it("gives the player a dash button of 120 px or more, two players theirs, smaller only where two share a frame under 300 px, with pause, sound and music in the bar", () => {
    for (const [width, height, fill] of SIZES) {
      for (const pair of [false, true]) {
        const layout = playLayout(width, height, { fill, pair });
        const targets = playTargets(layout, { volume: false });
        expect(targets.filter((one) => one.kind === "dash").map((one) => one.value)).toEqual(pair ? [0, 1] : [0]);
        checkTargets(targets, { width, height, fill, name: pair ? "pair" : "one", least: (target) => (target.kind !== "dash" ? 48 : pair && Math.min(width, height - 72) < 300 ? 88 : 120) });
        expect(playTargets(layout, { volume: true })[0].kind).toBe("volume");
      }
    }
  });

  it("puts the platform above the button on a phone, as designed, and beside it where the frame is short", () => {
    const phone = playLayout(384, 801, { fill: true });
    expect(phone.side).toBe(false);
    expect(phone.dash[0].y).toBeGreaterThan(phone.platform.y + phone.platform.r * 0.58);
    expect(phone.dash[0].x + phone.dash[0].w / 2).toBeCloseTo(192, 6);
    const room = playLayout(360, 343, { fill: false });
    expect(room.side).toBe(true);
    expect(room.dash[0].x).toBeGreaterThan(room.platform.x + room.platform.r);
    const tablet = playLayout(1280, 748, { fill: true, pair: true });
    expect(tablet.side).toBe(false);
    expect(tablet.dash[1].y).toBeLessThan(tablet.platform.y);
  });

  it("stands a player on the platform where the round has it, the far edge higher on the screen and squashed, turned round for the far seat", () => {
    const layout = playLayout(384, 801, { fill: true });
    const { x, y, r } = layout.platform;
    expect(footOf(layout, 0, 0)).toEqual([x, y]);
    expect(footOf(layout, 1, 0)).toEqual([x + r, y]);
    expect(footOf(layout, 0, 1)[1]).toBeCloseTo(y + r * 0.58, 9);
    expect(footOf(layout, 0.5, 1, 1)).toEqual([x - 0.5 * r, y - r * 0.58]);
    expect(FIGURE).toBeLessThan(0.7);
  });

  it("takes a finger anywhere under the bar for the player, and splits the screen between the two players of one device", () => {
    for (const [width, height, fill] of SIZES) {
      const single = playLayout(width, height, { fill });
      const top = single.bar.y + single.bar.h;
      expect(seatAt(single, { x: 5, y: top + 20 })).toBe(0);
      expect(seatAt(single, { x: width / 2, y: 20 })).toBeNull();
      const pair = playLayout(width, height, { fill, pair: true });
      for (const seat of [0, 1]) {
        const dash = pair.dash[seat];
        expect(seatAt(pair, { x: dash.x + dash.w / 2, y: dash.y + dash.h / 2 }), `${width}x${height}`).toBe(seat);
        expect(within(pair.zones[seat], { x: dash.x + 1, y: dash.y + 1 })).toBe(true);
      }
      expect(overlap(pair.zones[0], pair.zones[1])).toBe(false);
    }
  });

  it("leaves the pause out of the bar of a round with a friend, sound and music where they were", () => {
    for (const [width, height, fill] of SIZES) {
      const layout = playLayout(width, height, { fill, pause: false });
      expect(layout.controls.pause).toBeNull();
      expect(playTargets(layout).some((one) => one.kind === "pause")).toBe(false);
      expect(layout.controls.speaker).toEqual(playLayout(width, height, { fill }).controls.speaker);
    }
  });
});
