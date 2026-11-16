import { describe, expect, it } from "vitest";
import { CARD_RATIO } from "../../../kit/src/cards/faces.js";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { atLeast, backRow, cardRow, drawFelt, drawFlight, drawStack, flightDone, frameOf } from "../src/table.js";
import { themeFor } from "../src/theme.js";

const theme = themeFor(null, { dark: false });
const spy = () => {
  const drawn = [];
  return { drawn, draw: (ctx, key, box) => drawn.push({ key, box }) };
};
const CARD = { w: 40, h: 40 * CARD_RATIO };

describe("the table every game is laid on", () => {
  it("is a framed cloth inside its square at every size, in the colours of the table it is given", () => {
    for (const size of [200, 300, 343, 720]) {
      const felt = draw((ctx) => drawFelt(ctx, theme, frameOf(size), theme.tables.wood));
      const area = bounds(painted(felt));
      expect(area.left).toBeGreaterThanOrEqual(0);
      expect(area.bottom).toBeLessThanOrEqual(size);
      expect(felt.calls.some((call) => call.op === "set" && call.value === theme.tables.wood.felt)).toBe(true);
      const { inner } = frameOf(size);
      expect(inner.w).toBeGreaterThan(size * 0.9);
    }
  });

  it("gives a place at least 44 px to touch, kept inside the board", () => {
    expect(atLeast({ x: 100, y: 100, w: 30, h: 42 }, 343)).toEqual({ x: 93, y: 99, w: 44, h: 44 });
    expect(atLeast({ x: 2, y: 330, w: 30, h: 10 }, 343)).toEqual({ x: 0, y: 299, w: 44, h: 44 });
    expect(atLeast({ x: 10, y: 10, w: 60, h: 84 }, 343)).toEqual({ x: 10, y: 10, w: 60, h: 84 });
  });

  it("lays a row of cards centred in its box, side by side while they fit and overlapped when they do not", () => {
    const box = { x: 10, y: 50, w: 300, h: CARD.h };
    const few = cardRow(box, 3, CARD);
    expect(few).toHaveLength(3);
    expect(few[1].x - few[0].x).toBeGreaterThan(CARD.w);
    expect((few[0].x + few[2].x + CARD.w) / 2).toBeCloseTo(160, 5);
    const many = cardRow(box, 12, CARD);
    expect(many[1].x - many[0].x).toBeLessThan(CARD.w);
    expect(many[0].x).toBeCloseTo(10, 5);
    expect(many.at(-1).x + CARD.w).toBeCloseTo(310, 5);
    expect(cardRow(box, 0, CARD)).toEqual([]);
    expect(cardRow(box, 4, CARD, { step: 0.5 })[1].x - cardRow(box, 4, CARD, { step: 0.5 })[0].x).toBeCloseTo(20, 5);
  });

  it("shows the other player's hand as at most ten backs and a count beside them, the same for any cards", () => {
    const box = { x: 10, y: 10, w: 320, h: 42 };
    const seven = backRow(box, 7, { w: 30, h: 42 }, 24);
    expect(seven.backs).toHaveLength(7);
    expect(backRow(box, 25, { w: 30, h: 42 }, 24).backs).toHaveLength(10);
    expect(seven.count.x).toBeGreaterThan(seven.backs.at(-1).x + 30);
    expect(backRow(box, 0, { w: 30, h: 42 }, 24).backs).toEqual([]);
  });

  it("draws a pile as up to three backs one over the other, thicker with more cards, and nothing for an empty one", () => {
    const stack = (count) => {
      const sprites = spy();
      draw((ctx) => drawStack(ctx, theme, sprites, { x: 50, y: 50, ...CARD }, count, 1));
      return sprites.drawn;
    };
    expect(stack(0)).toHaveLength(0);
    expect(stack(5)).toHaveLength(1);
    expect(stack(40)).toHaveLength(3);
    expect(stack(40).every((one) => one.key === "back")).toBe(true);
  });

  it("flies a card from one place to another, turning it over half way when asked, and is done when its time is up", () => {
    const flight = { card: 7, from: { x: 0, y: 0, ...CARD }, to: { x: 100, y: 200, ...CARD }, delay: 100, ms: 200, flip: "up" };
    const at = (elapsed) => {
      const sprites = spy();
      const ctx = draw((pen) => drawFlight(pen, theme, sprites, flight, elapsed, 1));
      return { key: sprites.drawn[0]?.key, depth: ctx.depth };
    };
    expect(at(0).key).toBe("back");
    expect(at(150).key).toBe("back");
    expect(at(260).key).toBe("f7");
    expect(at(300).key).toBeUndefined();
    expect(at(150).depth).toBe(0);
    expect(flightDone(flight, 299)).toBe(false);
    expect(flightDone(flight, 300)).toBe(true);
    const down = { ...flight, flip: "down" };
    const first = spy();
    draw((pen) => drawFlight(pen, theme, first, down, 120, 1));
    expect(first.drawn[0].key).toBe("f7");
    const late = spy();
    draw((pen) => drawFlight(pen, theme, late, { ...flight, flip: null, since: 60 }, 50, 1));
    expect(late.drawn).toEqual([]);
    const hidden = spy();
    draw((pen) => drawFlight(pen, theme, hidden, { ...flight, card: null, flip: null }, 200, 1));
    expect(hidden.drawn[0].key).toBe("back");
  });
});
