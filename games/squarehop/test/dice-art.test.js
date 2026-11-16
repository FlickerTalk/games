import { describe, expect, it } from "vitest";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { tokensFor } from "../../../kit/test/canvas/themes.js";
import { PIPS, drawDie } from "../src/dice-art.js";
import { themeFor } from "../src/theme.js";

const THEME = themeFor(tokensFor("mono-dark"));
const LOOK = THEME.art.dice.cream;
const arcs = (ctx) => ctx.calls.filter((call) => call.op === "arc").length;
const die = (face, options) => draw((pen) => drawDie(pen, 100, 100, 80, face, LOOK, THEME, options));

describe("a die", () => {
  it("shows as many pips as its face, and never a written number", () => {
    for (let face = 1; face <= 6; face += 1) {
      expect(PIPS[face].length).toBe(face);
      const ctx = die(face, {});
      expect(arcs(ctx)).toBe(face);
      expect(ctx.calls.some((call) => call.op === "fillText")).toBe(false);
    }
  });

  it("stays inside its box at rest, and the chosen one grows a halo around it", () => {
    const rest = bounds(painted(die(5, {})));
    expect(rest.left).toBeGreaterThanOrEqual(58);
    expect(rest.right).toBeLessThanOrEqual(142);
    const chosen = bounds(painted(die(5, { state: "chosen" })));
    expect(chosen.right).toBeGreaterThan(rest.right);
    expect(chosen.right).toBeLessThanOrEqual(100 + 80 * 0.75);
  });

  it("fades the die that was not chosen and the dice that wait for a seed, which show no pips", () => {
    const alpha = (ctx) => ctx.calls.filter((call) => call.op === "set" && call.name === "globalAlpha").map((call) => call.value);
    expect(Math.min(...alpha(die(3, { state: "unchosen" })))).toBeLessThan(0.6);
    const waiting = die(3, { state: "waiting", time: 1 });
    expect(Math.min(...alpha(waiting))).toBeLessThan(0.6);
    expect(arcs(waiting)).toBe(0);
  });

  it("changes face no more than three times a second while it rolls", () => {
    const faces = new Set();
    let changes = 0;
    let last = null;
    for (let ms = 0; ms < 1000; ms += 10) {
      const shown = arcs(die(4, { state: "rolling", time: ms / 1000 }));
      if (last !== null && shown !== last) changes += 1;
      last = shown;
      faces.add(shown);
    }
    expect(changes).toBeLessThanOrEqual(3);
    expect(faces.size).toBeGreaterThan(1);
  });

  it("looks pressed while a finger is on it", () => {
    const shape = (options) => JSON.stringify(die(2, options).calls.map((call) => call.points));
    expect(shape({ pressed: true })).not.toBe(shape({}));
  });
});
