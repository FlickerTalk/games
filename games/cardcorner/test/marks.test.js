import { describe, expect, it } from "vitest";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { countWidth, drawAction, drawBracket, drawBubble, drawCount, drawEmptySpot, drawFish, drawGlow, drawMiniCards, drawPendingClock, drawProgress, drawShade, drawTile } from "../src/marks.js";
import { themeFor } from "../src/theme.js";

const theme = themeFor(null, { dark: false });
const BOX = { x: 100, y: 100, w: 60, h: 84 };
const within = (ctx, box, reach) => {
  const area = bounds(painted(ctx));
  return area.left >= box.x - reach && area.right <= box.x + box.w + reach && area.top >= box.y - reach && area.bottom <= box.y + box.h + reach;
};
const styles = (ctx) => new Set(ctx.calls.filter((call) => call.op === "set" && (call.name === "fillStyle" || call.name === "strokeStyle")).map((call) => call.value));
const round = (x, y, r) => ({ x: x - r, y: y - r, w: r * 2, h: r * 2 });

describe("the marks on the card tables", () => {
  it("rings a card that may be touched, and a chosen one more strongly, close around the card", () => {
    const glow = draw((ctx) => drawGlow(ctx, theme, BOX));
    const chosen = draw((ctx) => drawGlow(ctx, theme, BOX, { chosen: true }));
    expect(within(glow, BOX, 6)).toBe(true);
    expect(styles(glow).has(theme.marks.glow)).toBe(true);
    expect(styles(chosen).has(theme.marks.chosen)).toBe(true);
    expect(glow.depth + chosen.depth).toBe(0);
  });

  it("shades a card over the card only, outlines an empty place and puts a clock on a move still on its way", () => {
    const shade = draw((ctx) => drawShade(ctx, theme, BOX));
    expect(within(shade, BOX, 0.01)).toBe(true);
    expect(shade.calls.some((call) => call.op === "set" && call.name === "globalAlpha" && call.value < 1)).toBe(true);
    const spot = draw((ctx) => drawEmptySpot(ctx, theme, BOX, theme.tables.cloth.line));
    expect(within(spot, BOX, 0.01)).toBe(true);
    expect(styles(spot)).toEqual(new Set([theme.tables.cloth.line]));
    expect(within(draw((ctx) => drawPendingClock(ctx, theme, BOX)), BOX, 0.01)).toBe(true);
  });

  it("writes a count in digits on a badge in the app's colours, large enough to read, and marks the side to play with the accent", () => {
    const badge = draw((ctx) => drawCount(ctx, theme, 27, 100, 50, 26));
    expect(badge.calls.find((call) => call.op === "fillText").text).toBe("27");
    expect(Number(/(\d+(?:\.\d+)?)px/.exec(badge.calls.filter((call) => call.name === "font").at(-1).value)[1])).toBeGreaterThanOrEqual(15);
    expect(styles(badge).has(theme.ui.surface)).toBe(true);
    expect(styles(badge).has(theme.ui.text)).toBe(true);
    expect(within(badge, { x: 100, y: 37, w: countWidth(27, 26), h: 26 }, 0.5)).toBe(true);
    const ending = draw((ctx) => drawCount(ctx, theme, 27, 100, 50, 26, { end: true }));
    expect(bounds(painted(ending)).right).toBeLessThanOrEqual(100.5);
    expect(styles(draw((ctx) => drawCount(ctx, theme, 3, 100, 50, 26, { active: true }))).has(theme.ui.accent)).toBe(true);
    expect(styles(badge).has(theme.ui.accent)).toBe(false);
  });

  it("draws a thin bracket over a group of cards, as wide as the group", () => {
    const bracket = draw((ctx) => drawBracket(ctx, theme.marks.chosen, 40, 90, 120, 6));
    const area = bounds(painted(bracket));
    expect(area.left).toBeCloseTo(40, 5);
    expect(area.right).toBeCloseTo(160, 5);
    expect(area.bottom - area.top).toBeCloseTo(6, 5);
  });

  it("says a rank in a speech bubble with no words, its tail towards the player asked", () => {
    const up = draw((ctx) => drawBubble(ctx, theme, 11, 100, 100, 48, { tail: -1 }));
    const down = draw((ctx) => drawBubble(ctx, theme, 11, 100, 100, 48, { tail: 1 }));
    expect(bounds(painted(up)).top).toBeLessThan(bounds(painted(down)).top);
    expect(bounds(painted(down)).bottom).toBeGreaterThan(bounds(painted(up)).bottom);
    expect(styles(up).has(theme.ui.surface)).toBe(true);
    expect(styles(up).has(theme.ui.text)).toBe(true);
    expect(up.calls.some((call) => call.op === "fillText")).toBe(false);
    expect(within(up, round(100, 100, 24), 14)).toBe(true);
  });

  it("draws a small fish for a trip to the pond, a few small cards for cards handed over, and a track for the battles played", () => {
    const fish = draw((ctx) => drawFish(ctx, theme, 100, 100, 40));
    expect(within(fish, round(100, 100, 20), 2)).toBe(true);
    expect(styles(fish).has(theme.marks.fish)).toBe(true);
    const cards = (count) => draw((ctx) => drawMiniCards(ctx, theme, 100, 100, 20, count)).calls.filter((call) => call.op === "fill").length;
    expect(cards(3)).toBe(3);
    expect(cards(1)).toBe(1);
    const track = draw((ctx) => drawProgress(ctx, theme, { x: 20, y: 50, w: 100, h: 8 }, 10, 40));
    expect(within(track, { x: 20, y: 50, w: 100, h: 8 }, 1)).toBe(true);
    expect(styles(track).has(theme.ui.accent)).toBe(true);
  });

  it("draws the round buttons of the table and the tiles of the chooser in the app's colours", () => {
    for (const kind of ["lay", "sort", "back"]) {
      const button = draw((ctx) => drawAction(ctx, theme, kind, 100, 100, 24));
      expect(within(button, round(100, 100, 24), 1), kind).toBe(true);
      expect(styles(button).has(theme.ui.surface), kind).toBe(true);
      expect(button.depth).toBe(0);
    }
    expect(draw((ctx) => drawAction(ctx, theme, "lay", 100, 100, 24)).calls).not.toEqual(draw((ctx) => drawAction(ctx, theme, "sort", 100, 100, 24)).calls);
    const tile = draw((ctx) => drawTile(ctx, theme, BOX));
    expect(within(tile, BOX, 0.01)).toBe(true);
    expect(styles(tile).has(theme.ui.surface)).toBe(true);
    expect(styles(draw((ctx) => drawTile(ctx, theme, BOX, { chosen: true }))).has(theme.ui.accent)).toBe(true);
  });
});
