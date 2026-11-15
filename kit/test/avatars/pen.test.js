import { describe, expect, it } from "vitest";
import { INK, circle, line, paint, polygon, roundedRect } from "../../src/avatars/pen.js";
import { draw } from "./recorder.js";

const ops = (ctx) => ctx.calls.map((call) => (call.op === "set" ? `${call.name}=${call.value}` : call.op));

describe("the pen", () => {
  it("fills before it strokes, in ink unless told otherwise, and skips what it is not given", () => {
    expect(ops(draw((ctx) => paint(ctx, "#FFCF3F")))).toEqual(["fillStyle=#FFCF3F", "fill", `strokeStyle=${INK}`, "lineWidth=3", "stroke"]);
    expect(ops(draw((ctx) => paint(ctx, null, "#fff", 2)))).toEqual(["strokeStyle=#fff", "lineWidth=2", "stroke"]);
    expect(ops(draw((ctx) => paint(ctx, "#000", null)))).toEqual(["fillStyle=#000", "fill"]);
  });

  it("draws a circle, a closed polygon and an open line as paths of their own", () => {
    expect(ops(draw((ctx) => circle(ctx, 0, 0, 5, "#fff")))).toEqual(["beginPath", "arc", "fillStyle=#fff", "fill", `strokeStyle=${INK}`, "lineWidth=3.2", "stroke"]);
    const shape = ops(draw((ctx) => polygon(ctx, [[0, 0], [4, 0], [0, 4]], "#fff")));
    expect(shape.slice(0, 5)).toEqual(["beginPath", "moveTo", "lineTo", "lineTo", "closePath"]);
    expect(ops(draw((ctx) => line(ctx, [[0, 0], [4, 4]], "#123", 2)))).toEqual(["beginPath", "moveTo", "lineTo", "strokeStyle=#123", "lineWidth=2", "stroke"]);
  });

  it("rounds a rectangle's corners no more than half its shorter side", () => {
    const ctx = draw((one) => roundedRect(one, 0, 0, 10, 40, 30));
    expect(ctx.calls.filter((call) => call.op === "arcTo").map((call) => call.radius)).toEqual([5, 5, 5, 5]);
  });
});
