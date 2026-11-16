import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { pieceOf } from "../src/pieces.js";
import { THEME } from "../src/theme.js";
import { drawBounce, drawConfetti, drawDust, drawEmptyBonus, drawHand, drawScoreBurst, drawStarFlight, drawWrapped } from "../src/bursts.js";

const themed = new Set(JSON.stringify(THEME).match(/#[0-9A-F]{6}|rgba\([^)]*\)/g));
const texts = (ctx) => ctx.calls.filter((call) => call.op === "fillText").map((call) => call.text);
const at = (progress, paint) => draw((ctx) => paint(ctx, progress));

describe("the short effects", () => {
  it("draw nothing before they start or once they are over", () => {
    const all = [
      (ctx, t) => drawDust(ctx, 100, 100, 40, t, THEME),
      (ctx, t) => drawConfetti(ctx, { x: 0, y: 0, w: 300, h: 300 }, t, 3, THEME),
      (ctx, t) => drawStarFlight(ctx, [10, 10], [200, 20], t, THEME),
      (ctx, t) => drawScoreBurst(ctx, 100, 100, 60, t, THEME, "en"),
      (ctx, t) => drawEmptyBonus(ctx, 100, 100, 160, t, THEME),
    ];
    for (const paint of all) {
      expect(painted(at(1, paint))).toEqual([]);
      expect(painted(at(0.5, paint)).length).toBeGreaterThan(0);
    }
  });

  it("show the points won as digits that rise from where they were won", () => {
    const early = at(0.1, (ctx, t) => drawScoreBurst(ctx, 100, 100, 60, t, THEME, "en"));
    const late = at(0.8, (ctx, t) => drawScoreBurst(ctx, 100, 100, 60, t, THEME, "en"));
    expect(texts(early)).toEqual(["+60"]);
    expect(late.calls.find((call) => call.op === "fillText").points[0][1]).toBeLessThan(early.calls.find((call) => call.op === "fillText").points[0][1]);
  });

  it("send a refused piece back along an arc to its slot", () => {
    const piece = pieceOf("square");
    const start = bounds(painted(at(0, (ctx, t) => drawBounce(ctx, piece, [300, 100], [60, 500], 40, 20, t, THEME))));
    const end = bounds(painted(at(1, (ctx, t) => drawBounce(ctx, piece, [300, 100], [60, 500], 40, 20, t, THEME))));
    expect((start.left + start.right) / 2).toBeCloseTo(300, 0);
    expect((end.top + end.bottom) / 2).toBeCloseTo(500, 0);
  });

  it("keep their colours in the theme", () => {
    for (const ctx of [
      at(0.4, (pen, t) => drawConfetti(pen, { x: 0, y: 0, w: 300, h: 300 }, t, 3, THEME)),
      at(0.4, (pen, t) => drawEmptyBonus(pen, 100, 100, 160, t, THEME)),
      at(0.4, (pen, t) => drawHand(pen, 100, 100, 64, t, THEME)),
      at(0.4, (pen, t) => drawWrapped(pen, { x: 0, y: 0, w: 80, h: 80 }, t, THEME)),
    ]) {
      for (const colour of colours(ctx)) expect(themed.has(colour), colour).toBe(true);
    }
  });

  it("draw the teaching hand around the point it presses, and a wrapped gift inside its box", () => {
    const hand = bounds(painted(at(0, (ctx, t) => drawHand(ctx, 100, 100, 64, t, THEME))));
    expect(hand.left).toBeGreaterThan(50);
    expect(hand.right).toBeLessThan(150);
    const gift = bounds(painted(at(0, (ctx, t) => drawWrapped(ctx, { x: 10, y: 20, w: 80, h: 80 }, t, THEME))));
    expect(gift.left).toBeGreaterThanOrEqual(10);
    expect(gift.right).toBeLessThanOrEqual(90);
    expect(gift.bottom).toBeLessThanOrEqual(100);
  });
});
