import { describe, expect, it } from "vitest";
import { bounds, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { drawBumpStar, drawBurst, drawConfetti, drawSplash, drawTapHand, drawUmbrella } from "../src/effects.js";
import { THEME } from "../src/theme.js";

const wide = (ctx) => {
  const area = bounds(painted(ctx));
  return area.right - area.left;
};

describe("what answers the player", () => {
  it("pops a star where two players bump, larger for a harder bump, gone when it ends", () => {
    const small = draw((pen) => drawBumpStar(pen, 100, 100, 40, 0.5, THEME));
    const big = draw((pen) => drawBumpStar(pen, 100, 100, 80, 0.5, THEME));
    expect(wide(big)).toBeGreaterThan(wide(small) * 1.6);
    expect(draw((pen) => drawBumpStar(pen, 100, 100, 80, 1, THEME)).calls.filter((call) => call.op === "fill")).toHaveLength(0);
    expect(big.depth).toBe(0);
  });

  it("splashes wider as it goes, drops thrown up and out, and is over at the end", () => {
    const early = draw((pen) => drawSplash(pen, 100, 300, 80, 0.15, THEME));
    const late = draw((pen) => drawSplash(pen, 100, 300, 80, 0.7, THEME));
    expect(wide(late)).toBeGreaterThan(wide(early));
    expect(bounds(painted(late)).top).toBeLessThan(300);
    expect(draw((pen) => drawSplash(pen, 100, 300, 80, 1, THEME)).calls.filter((call) => call.op === "stroke")).toHaveLength(0);
  });

  it("bursts around a point for a point made, and showers the card for a round won", () => {
    expect(draw((pen) => drawBurst(pen, 50, 50, 60, 0.4, THEME)).calls.filter((call) => call.op === "stroke").length).toBeGreaterThanOrEqual(8);
    const card = { x: 20, y: 40, w: 300, h: 400 };
    const area = bounds(painted(draw((pen) => drawConfetti(pen, card, 0.5, THEME))));
    expect(area.left).toBeGreaterThanOrEqual(card.x - 12);
    expect(area.right).toBeLessThanOrEqual(card.x + card.w + 12);
  });

  it("draws the umbrella and the hand that taps, the hand going down and up in a loop", () => {
    expect(draw((pen) => drawUmbrella(pen, 100, 100, 70, THEME, 0)).depth).toBe(0);
    const [up, down] = [0.9, 0.22].map((progress) => bounds(painted(draw((pen) => drawTapHand(pen, 100, 100, 80, progress, THEME)))));
    expect(down.bottom).toBeGreaterThan(up.bottom);
    expect(shapes(draw((pen) => drawTapHand(pen, 100, 100, 80, 0, THEME))).join()).toBe(shapes(draw((pen) => drawTapHand(pen, 100, 100, 80, 1, THEME))).join());
  });
});
