import { describe, expect, it } from "vitest";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawTable, handPlaces, layoutFor } from "../src/paint.js";
import { themeFor } from "../src/theme.js";

const light = themeFor(null, { dark: false });
const dark = themeFor(null, { dark: true });
const SIZES = [120, 214, 300, 343, 480, 720];
const COUNTS = [1, 7, 12, 15, 25];
const HAND = [0, 5, 13, 20, 27, 40, 51];

const inside = (box, size) => box.x >= -0.01 && box.y >= -0.01 && box.x + box.w <= size + 0.01 && box.y + box.h <= size + 0.01;
const apart = (a, b) => a.x + a.w <= b.x + 0.01 || b.x + b.w <= a.x + 0.01 || a.y + a.h <= b.y + 0.01 || b.y + b.h <= a.y + 0.01;
const chipBox = ({ x, y, r }) => ({ x: x - r, y: y - r, w: r * 2, h: r * 2 });

function view(extra = {}) {
  return { size: 343, ratio: 1, mine: HAND, hidden: new Set(), lifted: new Set(), playable: new Set(), open: false, chosen: null, theirs: 7, stock: 30, pile: [8], suit: null, lastTheirs: false, pending: null, pass: false, picking: false, moving: null, floating: null, ...extra };
}

function spy() {
  const drawn = [];
  return { drawn, draw: (ctx, key, box, paint, ratio, at) => drawn.push({ key, box, at }) };
}

describe("the card table laid out", () => {
  it("keeps the other side's cards, the stock and the pile, and the user's hand apart and inside the board at every size", () => {
    for (const size of SIZES) {
      for (const count of COUNTS) {
        const layout = layoutFor(size, count);
        const parts = [layout.rival.box, layout.stock, layout.pile, chipBox(layout.suit), layout.hand.box];
        for (const part of parts) expect(inside(part, size), `${size}/${count}`).toBe(true);
        for (const [at, one] of parts.entries()) for (const other of parts.slice(at + 1)) expect(apart(one, other), `${size}/${count}`).toBe(true);
      }
    }
  });

  it("leaves every card of the hand at least 44 px to touch, side by side and row behind row, with 15 cards on a phone", () => {
    for (const count of [7, 15, 21]) {
      const cards = Array.from({ length: count }, (_, at) => at);
      const places = handPlaces(layoutFor(343, count), cards, new Set(cards.filter((card) => card % 3 === 0)));
      for (const { reach } of places) {
        expect(reach.w, `${count}`).toBeGreaterThanOrEqual(44);
        expect(reach.h, `${count}`).toBeGreaterThanOrEqual(40);
      }
    }
    expect(layoutFor(343, 7).hand.rows).toBe(1);
  });

  it("gives each suit to choose a round button of at least 44 px, inside the board", () => {
    for (const size of SIZES.filter((one) => one >= 214)) {
      const { picker } = layoutFor(size, 7);
      expect(picker.chips).toHaveLength(4);
      for (const chip of picker.chips) {
        expect(chip.r * 2, `${size}`).toBeGreaterThanOrEqual(44);
        expect(inside(chipBox(chip), size)).toBe(true);
      }
      expect(inside(picker.panel, size)).toBe(true);
    }
  });
});

describe("the card table drawn", () => {
  it("draws inside its square at every size, the felt with a light rim on a dark page only", () => {
    for (const size of SIZES) {
      const area = bounds(painted(draw((ctx) => drawTable(ctx, light, view({ size }), spy()))));
      expect(area.left).toBeGreaterThanOrEqual(0);
      expect(area.top).toBeGreaterThanOrEqual(0);
      expect(area.right).toBeLessThanOrEqual(size);
      expect(area.bottom).toBeLessThanOrEqual(size);
    }
    const strokes = (theme) => draw((ctx) => drawTable(ctx, theme, view(), spy())).calls.filter((call) => call.op === "set" && call.name === "strokeStyle").map((call) => call.value);
    expect(strokes(dark)).toContain(dark.rim);
    expect(strokes(light)).not.toContain(dark.rim);
  });

  it("shows the user's cards face up, the other side's and the stock's as backs with their counts, and the pile's top card", () => {
    const sprites = spy();
    const ctx = draw((pen) => drawTable(pen, light, view(), sprites));
    const faces = sprites.drawn.filter(({ key }) => key.startsWith("f")).map(({ key }) => Number(key.slice(1)));
    expect(faces).toEqual([8, ...HAND]);
    expect(sprites.drawn.filter(({ key }) => key === "back").length).toBeGreaterThanOrEqual(7);
    expect(ctx.calls.filter((call) => call.op === "fillText").map((call) => call.text)).toEqual(["7", "30"]);
  });

  it("leaves out a card that is on its way, and draws the moving and the carried card where they are", () => {
    const sprites = spy();
    const moving = { card: 5, from: { x: 0, y: 0, w: 60, h: 84 }, to: { x: 200, y: 100, w: 70, h: 98 }, progress: 0.5, flip: false };
    draw((pen) => drawTable(pen, light, view({ hidden: new Set([5, 20]), moving, floating: { card: 20, x: 150, y: 150 } }), sprites));
    const faces = sprites.drawn.filter(({ key }) => key.startsWith("f"));
    expect(faces.filter(({ key }) => key === "f5")).toHaveLength(1);
    expect(faces.filter(({ key }) => key === "f20")).toHaveLength(1);
    const flying = faces.find(({ key }) => key === "f5").box;
    expect(flying.w).toBeGreaterThan(60);
    expect(flying.w).toBeLessThan(70);
    expect(faces.find(({ key }) => key === "f5").at).toEqual(moving.to);
  });

  it("offers the pass where the stock was once it is gone, rings the cards that may be played and shades the others", () => {
    const sprites = spy();
    const ctx = draw((pen) => drawTable(pen, light, view({ stock: 0, pass: true, open: true, playable: new Set([5]), lifted: new Set([5]) }), sprites));
    expect(ctx.calls.filter((call) => call.op === "fillText").map((call) => call.text)).toEqual(["7"]);
    const styles = ctx.calls.filter((call) => call.op === "set" && call.name === "strokeStyle").map((call) => call.value);
    expect(styles).toContain(light.marks.glow);
    expect(ctx.calls.filter((call) => call.op === "set" && call.name === "fillStyle" && call.value === light.marks.shade)).toHaveLength(HAND.length - 1);
  });

  it("leaves out the other side's backs still on their way, and fades a pass out over the stock's place", () => {
    const backs = (extra) => {
      const sprites = spy();
      draw((pen) => drawTable(pen, light, view({ stock: 20, ...extra }), sprites));
      return sprites.drawn.filter(({ key }) => key === "back").length;
    };
    expect(backs({ arriving: 1 })).toBe(backs({}) - 1);
    const faded = draw((pen) => drawTable(pen, light, view({ stock: 0, passing: 0.5 }), spy()));
    expect(faded.calls.some((call) => call.op === "set" && call.name === "globalAlpha" && Math.abs(call.value - 0.5) < 0.01)).toBe(true);
  });
});
