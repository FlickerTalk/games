import { describe, expect, it } from "vitest";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { diceFaces, drawDice, drawDie } from "../src/dice.js";
import { diceSpots, layoutFor, pipsAt } from "../src/layout.js";
import { themeFor } from "../src/theme.js";

const theme = themeFor(null, { dark: false });
const SIZE = 40;
const die = (value, options) => draw((ctx) => drawDie(ctx, theme, 100, 100, SIZE, value, options));
const pips = (ctx) => ctx.calls.filter((call) => call.op === "arc" && call.radius < SIZE * 0.1).length;
const alphas = (ctx) => ctx.calls.filter((call) => call.op === "set" && call.name === "globalAlpha").map((call) => call.value);

describe("a die", () => {
  it("is a rounded face with the standard pips, one to six, inside its square", () => {
    for (let value = 1; value <= 6; value += 1) {
      const ctx = die(value, { side: 0 });
      expect(pips(ctx), `${value}`).toBe(value);
      const area = bounds(painted(ctx));
      expect(area.left).toBeGreaterThanOrEqual(100 - SIZE * 0.55);
      expect(area.right).toBeLessThanOrEqual(100 + SIZE * 0.55);
      expect(area.bottom).toBeLessThanOrEqual(100 + SIZE * 0.62);
      expect(ctx.depth).toBe(0);
      expect(ctx.calls.some((call) => call.op === "fillText")).toBe(false);
    }
  });

  it("shows a used die faded and struck through", () => {
    const fresh = die(4, { used: false });
    const used = die(4, { used: true });
    expect(Math.min(...alphas(used))).toBeLessThan(0.6);
    expect(alphas(fresh).every((value) => value === 1)).toBe(true);
    expect(used.calls.filter((call) => call.op === "stroke").length).toBeGreaterThan(fresh.calls.filter((call) => call.op === "stroke").length);
  });

  it("tumbles onto its spot: turned and away from it as it starts, flat and in place once it lands", () => {
    const start = die(5, { tumble: 0 });
    const landed = die(5, { tumble: 1 });
    expect(bounds(painted(start))).not.toEqual(bounds(painted(die(5))));
    expect(bounds(painted(landed))).toEqual(bounds(painted(die(5))));
    expect(pips(landed)).toBe(5);
  });

  it("tumbles in place, so four dice rolling side by side never touch one another or the pip counts", () => {
    const layout = layoutFor(320);
    const spots = diceSpots(layout, 4);
    const [mine, theirs] = pipsAt(layout);
    for (const tumble of [0, 0.1, 0.25, 0.5, 0.75, 0.9]) {
      const areas = spots.map(({ x, y, size }, at) => bounds(painted(draw((ctx) => drawDie(ctx, theme, x, y, size, 6, { tumble, turn: at % 2 ? -1 : 1 })))));
      for (let at = 1; at < areas.length; at += 1) expect(areas[at].left, `${tumble}`).toBeGreaterThan(areas[at - 1].right);
      expect(areas[0].left).toBeGreaterThan(mine.x + mine.width);
      expect(areas[3].right).toBeLessThan(theirs.x - theirs.width);
      for (const area of areas) expect(area.top).toBeGreaterThan(layout.table.y + layout.table.h);
    }
  });

  it("waits for the roll blank and faded, rocking gently, never more than three times a second", () => {
    const waiting = (time) => die(3, { waiting: true, time });
    expect(pips(waiting(0))).toBe(0);
    expect(Math.min(...alphas(waiting(0)))).toBeLessThan(1);
    const lefts = Array.from({ length: 101 }, (_, at) => bounds(painted(waiting(at / 100))).left);
    const peaks = lefts.filter((value, at) => at > 0 && at < 100 && value > lefts[at - 1] && value >= lefts[at + 1]).length;
    expect(peaks).toBeLessThanOrEqual(3);
    expect(Math.max(...lefts)).toBeGreaterThan(Math.min(...lefts));
  });
});

describe("the dice of a turn", () => {
  it("shows two dice, each used once a checker moved by it", () => {
    expect(diceFaces([3, 5], [3, 5])).toEqual({ faces: [3, 5], used: [false, false] });
    expect(diceFaces([3, 5], [5])).toEqual({ faces: [3, 5], used: [true, false] });
    expect(diceFaces([3, 5], [])).toEqual({ faces: [3, 5], used: [true, true] });
  });

  it("shows four dice for doubles, used one by one", () => {
    expect(diceFaces([4, 4], [4, 4, 4, 4])).toEqual({ faces: [4, 4, 4, 4], used: [false, false, false, false] });
    expect(diceFaces([4, 4], [4])).toEqual({ faces: [4, 4, 4, 4], used: [true, true, true, false] });
  });

  it("draws them in the dock, in the colours of the side that rolled", () => {
    const layout = layoutFor(352);
    const pair = draw((ctx) => drawDice(ctx, theme, layout, { side: 1, faces: [6, 2], used: [false, false] }));
    expect(pips(pair)).toBe(8);
    const fills = pair.calls.filter((call) => call.op === "set" && call.name === "fillStyle").map((call) => call.value);
    expect(fills).toContain(theme.dice[1].face);
    expect(fills).not.toContain(theme.dice[0].face);
    const four = draw((ctx) => drawDice(ctx, theme, layout, { side: 0, faces: [2, 2, 2, 2], used: [true, false, false, false] }));
    expect(pips(four)).toBe(8);
    const area = bounds(painted(four));
    const spots = diceSpots(layout, 4);
    expect(area.left).toBeGreaterThanOrEqual(spots[0].x - spots[0].size * 0.6);
    expect(area.right).toBeLessThanOrEqual(spots[3].x + spots[3].size * 0.6);
  });
});
