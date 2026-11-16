import { describe, expect, it } from "vitest";
import { EXPRESSIONS } from "../../src/avatars/cast.js";
import { drawExpression } from "../../src/avatars/expressions.js";
import { INK } from "../../src/avatars/pen.js";
import { colours, draw, shapes } from "../canvas/recorder.js";

const face = (expression, options = {}) => draw((ctx) => drawExpression(ctx, expression, options));

describe("the expressions", () => {
  it("are twelve different faces, and neutral for a name they do not know", () => {
    const drawn = EXPRESSIONS.map((expression) => JSON.stringify(shapes(face(expression))));
    expect(new Set(drawn).size).toBe(12);
    for (const unknown of [undefined, "angry", "constructor"]) expect(shapes(face(unknown)), String(unknown)).toEqual(shapes(face("neutral")));
  });

  it("are drawn in ink on a player, and in mint without teeth or tongue on Flick's screen", () => {
    for (const expression of EXPRESSIONS) {
      expect(colours(face(expression)).every((one) => [INK, "#FFFDF5", "#FF6B54"].includes(one)), expression).toBe(true);
      expect(colours(face(expression, { robot: true })).every((one) => one === "#A9F4E6"), expression).toBe(true);
    }
    expect(colours(face("laughing"))).toContain("#FF6B54");
  });

  it("blink only where the eyes are open, each profile at its own moment", () => {
    const at = (expression, time, phase = 0) => shapes(face(expression, { time, phase }));
    expect(at("neutral", 4.5)).not.toEqual(at("neutral", 0));
    expect(at("happy", 4.5)).toEqual(at("happy", 0));
    expect(at("dizzy", 4.5)).toEqual(at("dizzy", 0));
    expect(at("neutral", 4.5, 1)).toEqual(at("neutral", 0, 1));
  });
});
