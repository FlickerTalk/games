import { describe, expect, it } from "vitest";
import { overlap } from "../../../kit/src/canvas/layout.js";
import { SIZES, checkTargets, inside } from "../../../kit/test/canvas/sizes.js";
import { balloonAt, playLayout, playTargets, rulerX, shareAt, stageLayout } from "../src/layout.js";

const BAR = new Set(["pause", "speaker", "music"]);
const least = (target) => (BAR.has(target.kind) ? 48 : 88);
const each = (run) => SIZES.forEach(([width, height, fill]) => run({ width, height, fill, name: `${width}x${height}${fill ? " fill" : ""}` }));
const figure = ({ x, y, size }) => ({ x: x - size * 0.45, y: y - size, w: size * 0.9, h: size });

describe("the play screen", () => {
  it("offers the ruler in parts wide enough for a finger, pause and the sound, inside the frame and clear of the bottom corners", () => {
    each(({ width, height, fill, name }) => {
      for (const rival of [false, true]) {
        const layout = playLayout(width, height, { fill, rival });
        const targets = playTargets(layout);
        const parts = targets.filter((one) => one.kind === "ruler");
        expect(parts.length, name).toBe(layout.slices);
        expect(parts.length, name).toBeGreaterThanOrEqual(3);
        expect(parts.map((one) => one.value), name).toEqual(parts.map((_, at) => at));
        expect(targets.filter((one) => one.kind !== "ruler").map((one) => one.kind).sort(), name).toEqual(["music", "pause", "speaker"]);
        checkTargets(targets, { width, height, fill, name, least });
        expect(playTargets(layout, { volume: true })[0].kind).toBe("volume");
        for (const part of parts) expect(part.y + part.h, name).toBeGreaterThanOrEqual(layout.ruler.y + layout.ruler.h);
      }
    });
  });

  it("keeps the bar on top, then the card, the balloons and the ruler, each inside the frame and apart", () => {
    each(({ width, height, fill, name }) => {
      const layout = playLayout(width, height, { fill, flick: true });
      const { bar, card, ruler, zone, timer } = layout;
      for (const area of [card, ruler, timer]) expect(inside(area, width, height), name).toBe(true);
      expect(card.y, name).toBeGreaterThanOrEqual(bar.y + bar.h);
      expect(timer.y, name).toBeGreaterThanOrEqual(bar.y + bar.h);
      expect(timer.y + timer.h, name).toBeLessThanOrEqual(card.y);
      expect(overlap(card, ruler), name).toBe(false);
      expect(card.w, name).toBeGreaterThanOrEqual(60);
      expect(card.h, name).toBeGreaterThanOrEqual(56);
      expect(ruler.w, name).toBeGreaterThanOrEqual(width * 0.5);
      expect(ruler.h, name).toBeGreaterThanOrEqual(44);
      expect(ruler.y + ruler.h + 24, name).toBeLessThanOrEqual(height);
      expect(zone.bottom, name).toBe(ruler.y);
      expect(zone.bottom - zone.top, name).toBeGreaterThanOrEqual(100);
      expect(layout.thread, name).toBeGreaterThan(ruler.y + ruler.h);
      expect(layout.thread + 12, name).toBeLessThanOrEqual(height);
    });
  });

  it("stands the archer clear of the ruler and the card, and Flick beside on a phone held upright", () => {
    each(({ width, height, fill, name }) => {
      const layout = playLayout(width, height, { fill, flick: true });
      const body = figure(layout.archer);
      expect(inside(body, width, height), name).toBe(true);
      expect(layout.archer.size, name).toBeGreaterThanOrEqual(56);
      expect(overlap(body, layout.ruler), name).toBe(false);
      expect(overlap(body, layout.card), name).toBe(false);
      expect(body.y, name).toBeGreaterThanOrEqual(layout.bar.y + layout.bar.h);
      if (layout.mode !== "tall") expect(layout.flick, name).toBeNull();
      else {
        expect(inside(figure(layout.flick), width, height), name).toBe(true);
        expect(overlap(figure(layout.flick), body), name).toBe(false);
        expect(layout.flick.flip).toBe(true);
      }
      expect(playLayout(width, height, { fill }).flick, name).toBeNull();
    });
  });

  it("floats every balloon between the card and the ruler, its string reaching down to its place", () => {
    each(({ width, height, fill, name }) => {
      const layout = playLayout(width, height, { fill });
      for (const size of [0, 1, 2]) {
        for (const lift of [0, 1]) {
          const at = balloonAt(layout, { share: 0.5, size, lift });
          expect(at.size, name).toBeGreaterThanOrEqual(24);
          expect(at.y - at.size * 0.56, name).toBeGreaterThanOrEqual(layout.zone.top);
          expect(at.y + at.size * 0.69, name).toBeLessThan(layout.ruler.y);
          expect(at.x, name).toBeCloseTo(rulerX(layout, 0.5));
        }
      }
      expect(balloonAt(layout, { share: 0.2, size: 0, lift: 0 }).size).toBeLessThan(balloonAt(layout, { share: 0.2, size: 2, lift: 0 }).size);
    });
  });

  it("turns a touch into a place on the ruler and back, the ends kept inside it", () => {
    const layout = playLayout(384, 801, { fill: true });
    expect(rulerX(layout, 0)).toBe(layout.ruler.x + 8);
    expect(rulerX(layout, 1)).toBe(layout.ruler.x + layout.ruler.w - 8);
    expect(shareAt(layout, rulerX(layout, 0.37))).toBeCloseTo(0.37);
    expect(shareAt(layout, -50)).toBe(0);
    expect(shareAt(layout, 5000)).toBe(1);
  });

  it("puts the card over the ruler on a phone held upright, beside the archer in a small room and at the ruler's side on a wide frame", () => {
    expect(playLayout(384, 801, { fill: true }).mode).toBe("tall");
    expect(playLayout(360, 588, { fill: true }).mode).toBe("tall");
    expect(playLayout(360, 343).mode).toBe("compact");
    expect(playLayout(844, 338, { fill: true }).mode).toBe("wide");
    expect(playLayout(1280, 748, { fill: true }).mode).toBe("wide");
    const wide = playLayout(1280, 748, { fill: true });
    expect(wide.card.x + wide.card.w).toBeLessThanOrEqual(wide.ruler.x);
    expect(wide.archer.x).toBeGreaterThan(wide.ruler.x + wide.ruler.w);
    const upright = playLayout(384, 801, { fill: true });
    expect(upright.card.x + upright.card.w / 2).toBe(192);
    expect(upright.archer.y).toBeGreaterThan(upright.ruler.y + upright.ruler.h);
  });
});

describe("the ruler shown on the home screen", () => {
  it("fits whatever band the menu leaves it", () => {
    for (const area of [{ x: 0, y: 70, w: 384, h: 240 }, { x: 0, y: 60, w: 360, h: 90 }, { x: 0, y: 100, w: 1280, h: 300 }]) {
      const layout = stageLayout(area);
      expect(layout.ruler.x).toBeGreaterThanOrEqual(area.x);
      expect(layout.ruler.x + layout.ruler.w).toBeLessThanOrEqual(area.x + area.w);
      expect(layout.ruler.y + layout.ruler.h).toBeLessThanOrEqual(area.y + area.h);
      expect(layout.zone.top).toBeGreaterThanOrEqual(area.y);
    }
  });
});
