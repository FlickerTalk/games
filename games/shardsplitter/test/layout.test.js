import { describe, expect, it } from "vitest";
import { CORNER, overlap } from "../../../kit/src/canvas/layout.js";
import { SIZES, inside } from "../../../kit/test/canvas/sizes.js";
import { layoutTargets, piecePlaces, playLayout } from "../src/layout.js";

const HANDS = [
  { name: "alone", mine: [2, 5, 10], theirs: [], rival: false },
  { name: "pair", mine: [2, 4], theirs: [3, 5], rival: true },
  { name: "team", mine: [2, 4, 8], theirs: [3, 5, 9], rival: true },
];
const BAR = ["pause", "speaker", "music"];

function each(run) {
  for (const [width, height, fill] of SIZES) for (const hand of HANDS) run({ width, height, fill, ...hand, label: `${hand.name} ${width}x${height} ${fill ? "fill" : "room"}`, layout: playLayout(width, height, { ...hand, fill }) });
}

describe("the play screen's layout", () => {
  it("keeps the bar, the stage and every button inside the frame and apart", () => {
    each(({ width, height, layout, label }) => {
      const targets = layoutTargets(layout);
      for (const area of [layout.bar, layout.stage, layout.field, ...targets, ...layout.chips]) expect(inside(area, width, height), label).toBe(true);
      expect(overlap(layout.stage, layout.bar), label).toBe(false);
      for (const target of targets.filter((one) => !BAR.includes(one.kind))) expect(overlap(target, layout.stage), `${label} ${target.kind}`).toBe(false);
      targets.forEach((one, at) => targets.slice(at + 1).forEach((two) => expect(overlap(one, two), `${label} ${one.kind}:${one.value} ${two.kind}:${two.value}`).toBe(false)));
    });
  });

  it("gives each divisor a button of 88 px or more, named by its divisor, smaller only in the room of the smallest phones", () => {
    each(({ height, fill, layout, label, mine }) => {
      const hits = layoutTargets(layout).filter((one) => one.kind === "hit");
      expect(hits.map((one) => one.value), label).toEqual(mine);
      const least = fill || height >= 500 ? 88 : 66;
      for (const hit of hits) expect(Math.min(hit.w, hit.h), label).toBeGreaterThanOrEqual(least);
      expect(layout.scale, label).toBeGreaterThanOrEqual(0.75);
    });
    expect(playLayout(430, 880, { mine: [2, 5, 10], fill: true }).buttons[0].w).toBeGreaterThanOrEqual(120);
    expect(playLayout(1280, 748, { mine: [2, 5, 10], fill: true }).buttons[0].w).toBeGreaterThanOrEqual(120);
  });

  it("puts nothing to touch in the bottom corners of a full screen", () => {
    each(({ width, height, fill, layout, label }) => {
      if (!fill) return;
      const corners = [{ x: 0, y: height - CORNER, w: CORNER, h: CORNER }, { x: width - CORNER, y: height - CORNER, w: CORNER, h: CORNER }];
      for (const target of layoutTargets(layout)) for (const corner of corners) expect(overlap(target, corner), `${label} ${target.kind}`).toBe(false);
    });
  });

  it("stands the hero on the ground at the left, the teammate at the right with their divisors shown and not to be touched", () => {
    each(({ width, layout, label, theirs }) => {
      expect(layout.hero.x, label).toBeLessThan(width / 2);
      expect(layout.hero.size, label).toBeGreaterThanOrEqual(64);
      expect(layout.ground, label).toBeLessThanOrEqual(layout.stage.y + layout.stage.h);
      expect(layout.chips.map((chip) => chip.value), label).toEqual(theirs);
      for (const chip of layout.chips) {
        expect(Math.min(chip.w, chip.h), label).toBeGreaterThanOrEqual(40);
        expect(overlap(chip, layout.field), label).toBe(false);
      }
      if (theirs.length) expect((layout.mate ?? layout.seat).x, label).toBeGreaterThan(width / 2);
      else expect([layout.mate, layout.seat], label).toEqual([null, null]);
      expect(layoutTargets(layout).some((one) => one.kind === "chip"), label).toBe(false);
    });
  });

  it("leaves the golems room enough for a 20 px number even when twelve stand together", () => {
    each(({ layout, label, height, fill }) => {
      const one = piecePlaces(layout.field, 1);
      expect(one).toHaveLength(1);
      expect(one[0].size, label).toBeGreaterThanOrEqual(80);
      const twelve = piecePlaces(layout.field, 12);
      expect(twelve).toHaveLength(12);
      for (const piece of twelve) {
        expect(piece.size, label).toBeGreaterThanOrEqual(fill || height >= 400 ? 46 : 40);
        expect(piece.x - piece.size / 2, label).toBeGreaterThanOrEqual(layout.field.x - 0.5);
        expect(piece.x + piece.size / 2, label).toBeLessThanOrEqual(layout.field.x + layout.field.w + 0.5);
        expect(piece.y - piece.size / 2, label).toBeGreaterThanOrEqual(layout.field.y - 0.5);
      }
    });
  });

  it("shows the teammate whole where the stage is tall, and as a portrait beside their divisors where it is short", () => {
    const tall = playLayout(384, 801, { mine: [2, 4], theirs: [3, 5], fill: true, rival: true });
    expect(tall.mate.size).toBe(tall.hero.size);
    expect(tall.seat).toBeNull();
    const short = playLayout(844, 338, { mine: [2, 4], theirs: [3, 5], fill: true, rival: true });
    expect(short.mate).toBeNull();
    expect(short.seat.x).toBeLessThan(short.chips[0].x);
  });

  it("stands the pieces in rows from the ground up, each in its own place", () => {
    const field = { x: 100, y: 100, w: 300, h: 200 };
    for (const count of [2, 3, 4, 5, 6, 8, 9, 10, 12]) {
      const places = piecePlaces(field, count);
      expect(new Set(places.map((piece) => `${Math.round(piece.x)},${Math.round(piece.y)}`)).size, String(count)).toBe(count);
      expect(Math.max(...places.map((piece) => piece.y + piece.size / 2)), String(count)).toBeCloseTo(300, 0);
    }
  });

  it("keeps the jar in the bar beside the round's dots, and adds the volume line when the speaker has unfolded it", () => {
    const layout = playLayout(384, 801, { mine: [2, 5, 10], fill: true });
    expect(layout.jar.y).toBeLessThan(layout.bar.y + layout.bar.h);
    expect(layout.jar.size).toBeGreaterThanOrEqual(32);
    expect(layout.dots.x).toBeGreaterThan(layout.jar.x);
    expect(layoutTargets(layout, { volume: true })[0]).toMatchObject({ kind: "volume", ...layout.volume });
  });
});
