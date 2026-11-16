import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { drawCreature } from "../src/creatures.js";
import { CREATURES } from "../src/pond.js";
import { THEME } from "../src/theme.js";

const fills = (ctx) => ctx.calls.filter((call) => call.op === "set" && call.name === "fillStyle").map((call) => call.value);

describe("the twenty-four creatures", () => {
  it("each draw a shape of their own, centred where they swim and within their size", () => {
    const seen = new Set();
    CREATURES.forEach((name, kind) => {
      const ctx = draw((pen) => drawCreature(pen, 200, 150, 80, kind, THEME, { time: 0.4 }));
      expect(ctx.depth, name).toBe(0);
      const box = bounds(painted(ctx));
      expect(box.left, name).toBeGreaterThanOrEqual(200 - 80 * 0.66);
      expect(box.right, name).toBeLessThanOrEqual(200 + 80 * 0.66);
      expect(box.top, name).toBeGreaterThanOrEqual(150 - 80 * 0.66);
      expect(box.bottom, name).toBeLessThanOrEqual(150 + 80 * 0.66);
      seen.add(shapes(ctx).join("\n"));
    });
    expect(seen.size).toBe(24);
  });

  it("keep their approved colour, outlined in the art's ink", () => {
    CREATURES.forEach((name, kind) => {
      const ctx = draw((pen) => drawCreature(pen, 0, 0, 60, kind, THEME));
      expect(colours(ctx), name).toContain(THEME.art.creatures[kind]);
      expect(colours(ctx), name).toContain(THEME.art.ink);
    });
  });

  it("face the way they swim", () => {
    const right = draw((pen) => drawCreature(pen, 100, 100, 60, 0, THEME, { direction: 1 }));
    const left = draw((pen) => drawCreature(pen, 100, 100, 60, 0, THEME, { direction: -1 }));
    const mirror = (ctx) => painted(ctx).map(([x, y]) => [Math.round(200 - x), Math.round(y)]);
    expect(mirror(left)).toEqual(painted(right).map(([x, y]) => [Math.round(x), Math.round(y)]));
  });

  it("move with time, and smile when they are let go", () => {
    expect(shapes(draw((pen) => drawCreature(pen, 0, 0, 60, 0, THEME, { time: 0 })))).not.toEqual(shapes(draw((pen) => drawCreature(pen, 0, 0, 60, 0, THEME, { time: 0.3 }))));
    for (let kind = 0; kind < 24; kind += 1) {
      const plain = draw((pen) => drawCreature(pen, 0, 0, 60, kind, THEME));
      const smiling = draw((pen) => drawCreature(pen, 0, 0, 60, kind, THEME, { smile: true }));
      expect(smiling.calls.length, CREATURES[kind]).toBeGreaterThan(plain.calls.length);
    }
  });

  it("show as one quiet shape on the album's empty places, and some glow at night", () => {
    for (let kind = 0; kind < 24; kind += 1) {
      const ctx = draw((pen) => drawCreature(pen, 0, 0, 60, kind, THEME, { silhouette: true }));
      expect(new Set(fills(ctx)), CREATURES[kind]).toEqual(new Set([THEME.art.silhouette]));
    }
    const jelly = CREATURES.indexOf("jelly");
    expect(colours(draw((pen) => drawCreature(pen, 0, 0, 60, jelly, THEME, { night: true })))).toContain(THEME.art.glow);
    expect(colours(draw((pen) => drawCreature(pen, 0, 0, 60, 0, THEME, { night: true })))).not.toContain(THEME.art.glow);
  });

  it("draw the first one for a kind they do not know, instead of throwing", () => {
    expect(shapes(draw((pen) => drawCreature(pen, 0, 0, 60, 99, THEME)))).toEqual(shapes(draw((pen) => drawCreature(pen, 0, 0, 60, 0, THEME))));
  });
});
