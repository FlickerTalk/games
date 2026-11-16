import { describe, expect, it } from "vitest";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawCount, drawEmptySpot, drawGlow, drawLastMark, drawPassMark, drawPendingClock, drawPicker, drawShade, drawSuitChip } from "../src/marks.js";
import { themeFor } from "../src/theme.js";

const theme = themeFor(null, { dark: false });
const BOX = { x: 100, y: 100, w: 60, h: 84 };
const within = (ctx, box, reach) => {
  const area = bounds(painted(ctx));
  return area.left >= box.x - reach && area.right <= box.x + box.w + reach && area.top >= box.y - reach && area.bottom <= box.y + box.h + reach;
};
const styles = (ctx) => new Set(ctx.calls.filter((call) => call.op === "set" && (call.name === "fillStyle" || call.name === "strokeStyle")).map((call) => call.value));

describe("the marks on the card table", () => {
  it("rings a card that may be played, and a chosen eight more strongly, close around the card", () => {
    const glow = draw((ctx) => drawGlow(ctx, theme, BOX));
    const chosen = draw((ctx) => drawGlow(ctx, theme, BOX, { chosen: true }));
    expect(within(glow, BOX, 6)).toBe(true);
    expect(styles(glow).has(theme.marks.glow)).toBe(true);
    expect(styles(chosen).has(theme.marks.chosen)).toBe(true);
    const width = (ctx) => Math.max(...ctx.calls.filter((call) => call.op === "set" && call.name === "lineWidth").map((call) => call.value));
    expect(width(chosen)).toBeGreaterThan(width(glow));
    expect(glow.depth + chosen.depth).toBe(0);
  });

  it("shades a card that may not be played, over the card only", () => {
    const shade = draw((ctx) => drawShade(ctx, theme, BOX));
    expect(within(shade, BOX, 0.01)).toBe(true);
    expect(shade.calls.some((call) => call.op === "set" && call.name === "globalAlpha" && call.value < 1)).toBe(true);
    expect(shade.depth).toBe(0);
  });

  it("brackets the card the other side played last, in its four corners", () => {
    const mark = draw((ctx) => drawLastMark(ctx, theme, BOX));
    expect(within(mark, BOX, 8)).toBe(true);
    expect(mark.calls.filter((call) => call.op === "stroke").length).toBe(4);
  });

  it("pops in the suit an eight names, on a card-white chip, in that suit's colour", () => {
    expect(draw((ctx) => drawSuitChip(ctx, theme, 1, 50, 50, 20, 0)).calls).toHaveLength(0);
    const chip = draw((ctx) => drawSuitChip(ctx, theme, 1, 50, 50, 20, 1));
    expect(within(chip, { x: 30, y: 30, w: 40, h: 40 }, 6)).toBe(true);
    expect(styles(chip).has(theme.deck.red)).toBe(true);
    expect(styles(chip).has(theme.marks.chip)).toBe(true);
    const width = (progress) => {
      const area = bounds(painted(draw((ctx) => drawSuitChip(ctx, theme, 3, 50, 50, 20, progress))));
      return area.right - area.left;
    };
    expect(width(0.3)).toBeLessThan(width(1));
    expect(styles(draw((ctx) => drawSuitChip(ctx, theme, 3, 50, 50, 20, 1))).has(theme.deck.black)).toBe(true);
  });

  it("writes a count in digits on a badge in the app's colours, large enough to read", () => {
    const badge = draw((ctx) => drawCount(ctx, theme, 27, 100, 50, 26));
    const text = badge.calls.find((call) => call.op === "fillText");
    expect(text.text).toBe("27");
    expect(Number(/(\d+(?:\.\d+)?)px/.exec(badge.calls.filter((call) => call.name === "font").at(-1).value)[1])).toBeGreaterThanOrEqual(15);
    expect(styles(badge).has(theme.ui.surface)).toBe(true);
    expect(styles(badge).has(theme.ui.text)).toBe(true);
    expect(within(badge, { x: 100, y: 37, w: 40, h: 26 }, 0.5)).toBe(true);
    const before = bounds(painted(draw((ctx) => drawCount(ctx, theme, 27, 100, 50, 26, { end: true }))));
    expect(before.right).toBeCloseTo(100, 5);
  });

  it("offers the pass on the empty stock as a round control in the app's colours", () => {
    const pass = draw((ctx) => drawPassMark(ctx, theme, 100, 100, 48));
    expect(within(pass, { x: 76, y: 76, w: 48, h: 48 }, 0.5)).toBe(true);
    expect(styles(pass).has(theme.ui.surface)).toBe(true);
    const spot = draw((ctx) => drawEmptySpot(ctx, theme, BOX));
    expect(within(spot, BOX, 0.5)).toBe(true);
    expect(spot.calls.some((call) => call.op === "setLineDash" && call.segments.length)).toBe(true);
  });

  it("puts a small clock on a move that waits for the other phone, in the card's corner", () => {
    const clock = draw((ctx) => drawPendingClock(ctx, theme, BOX));
    const area = bounds(painted(clock));
    expect(area.left).toBeGreaterThan(BOX.x + BOX.w / 2);
    expect(area.bottom).toBeLessThan(BOX.y + BOX.h / 2);
  });

  it("asks for a suit with four card-white chips on a panel in the app's colours", () => {
    const panel = { x: 20, y: 120, w: 300, h: 80 };
    const chips = [0, 1, 2, 3].map((suit) => ({ suit, x: 65 + suit * 70, y: 160, r: 30 }));
    const picker = draw((ctx) => drawPicker(ctx, theme, { panel, chips }));
    expect(within(picker, panel, 0.5)).toBe(true);
    expect(styles(picker).has(theme.ui.surface)).toBe(true);
    expect(picker.calls.filter((call) => call.op === "arc" && Math.abs(call.radius - 30) < 0.01)).toHaveLength(4);
    expect(picker.depth).toBe(0);
  });
});
