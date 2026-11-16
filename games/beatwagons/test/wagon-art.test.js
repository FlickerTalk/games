import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { SHAPES, drawGap, drawWagon } from "../src/wagon-art.js";
import { THEME } from "../src/theme.js";
import { KINDS, wagonOf } from "../src/train.js";

const wagon = (id, options = {}, size = 72) => draw((ctx) => drawWagon(ctx, 200, 200, size, id, options, THEME));
const lines = (ctx) => shapes(ctx).join("\n");
const kinds = Array.from({ length: KINDS }, (_, kind) => kind);

describe("a wagon", () => {
  it("has its own silhouette and its own instrument for each of the eight kinds", () => {
    expect(SHAPES).toEqual(["circle", "square", "triangle", "diamond", "pentagon", "star", "heart", "moon"]);
    expect(new Set(kinds.map((kind) => lines(wagon(wagonOf(kind))))).size).toBe(KINDS);
  });

  it("is told apart without colour: the same colours on another wagon still draw another shape", () => {
    const plain = (ctx) => shapes(ctx).filter((line) => !line.includes('"set"')).join("\n");
    expect(new Set(kinds.map((kind) => plain(wagon(wagonOf(kind))))).size).toBe(KINDS);
  });

  it("stays within its footprint at every size, couplers and wheels included, and leaves the drawing state as it found it", () => {
    for (const size of [24, 42, 72, 84]) {
      for (const kind of kinds) {
        const ctx = wagon(wagonOf(kind, 3), {}, size);
        const box = bounds(painted(ctx));
        expect(box.left, `${kind} at ${size}`).toBeGreaterThanOrEqual(200 - size * 0.62);
        expect(box.right, `${kind} at ${size}`).toBeLessThanOrEqual(200 + size * 0.62);
        expect(box.top, `${kind} at ${size}`).toBeGreaterThanOrEqual(200 - size * 0.8);
        expect(box.bottom, `${kind} at ${size}`).toBeLessThanOrEqual(200 + size * 0.56);
        expect(ctx.depth).toBe(0);
      }
    }
  });

  it("shows two or three beats as that many dots above it, and one beat as none", () => {
    const dots = (id) => wagon(id).calls.filter((call) => call.op === "arc").length;
    const one = dots(wagonOf(1, 1));
    expect(dots(wagonOf(1, 2)) - one).toBe(2);
    expect(dots(wagonOf(1, 3)) - one).toBe(3);
  });

  it("keeps its dots at least 3 px across on the smallest train", () => {
    const small = wagon(wagonOf(1, 3), {}, 24).calls.filter((call) => call.op === "arc").map((call) => call.radius).slice(-3);
    expect(Math.min(...small)).toBeGreaterThanOrEqual(1.5);
  });

  it("hops when its note plays, tilts when it does not fit, and fades as a ghost", () => {
    const still = wagon(wagonOf(0));
    expect(bounds(painted(wagon(wagonOf(0), { hop: 0.5 }))).top).toBeLessThan(bounds(painted(still)).top);
    expect(lines(wagon(wagonOf(0), { wobble: 1, time: 0.07 }))).not.toBe(lines(still));
    expect(wagon(wagonOf(0), { ghost: true }).calls.some((call) => call.op === "set" && call.name === "globalAlpha" && call.value < 1)).toBe(true);
  });

  it("uses the colours of its kind from the theme", () => {
    expect(colours(wagon(wagonOf(3)))).toContain(THEME.art.wagons[3].body);
    expect(colours(wagon(wagonOf(3)))).not.toContain(THEME.art.wagons[4].body);
  });
});

describe("a gap", () => {
  it("is a dashed wagon on its wheels, with no shape to give the answer away", () => {
    const ctx = draw((pen) => drawGap(pen, 200, 200, 72, { time: 0 }, THEME));
    expect(ctx.calls.some((call) => call.op === "setLineDash" && call.segments.length === 2)).toBe(true);
    expect(ctx.calls.at(-1).op).toBe("restore");
    expect(ctx.depth).toBe(0);
  });

  it("shows the outline of the wagon it wants once the player needs a hand", () => {
    const plain = draw((pen) => drawGap(pen, 200, 200, 72, { time: 0 }, THEME));
    const hinted = kinds.map((kind) => lines(draw((pen) => drawGap(pen, 200, 200, 72, { time: 0, hint: wagonOf(kind) }, THEME))));
    expect(new Set(hinted).size).toBe(KINDS);
    expect(hinted).not.toContain(lines(plain));
  });
});
