import { describe, expect, it } from "vitest";
import { bounds, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { STAGES } from "../src/levels.js";
import { drawStage, drawStageIcon } from "../src/stages.js";
import { THEME } from "../src/theme.js";

const AREAS = [[{ x: 0, y: 68, w: 384, h: 733 }, 625], [{ x: 0, y: 60, w: 360, h: 283 }, 231], [{ x: 0, y: 60, w: 844, h: 278 }, 310], [{ x: 0, y: 68, w: 1280, h: 680 }, 576]];

describe("the stages", () => {
  it("are three places, each drawn differently, with the floor from the ground line down", () => {
    const drawn = STAGES.map((stage) => shapes(draw((pen) => drawStage(pen, AREAS[0][0], AREAS[0][1], stage, THEME))).join("|"));
    expect(new Set(drawn).size).toBe(3);
    for (const stage of STAGES) {
      const ctx = draw((pen) => drawStage(pen, AREAS[0][0], AREAS[0][1], stage, THEME));
      const floor = ctx.calls.find((call) => call.op === "fillRect" && Math.abs(call.points[0][1] - AREAS[0][1]) < 0.01);
      expect(floor, stage).toBeDefined();
      expect(floor.points[1][1], stage).toBeCloseTo(68 + 733, 4);
    }
  });

  it("clip themselves to their area at every size, with save and restore paired", () => {
    for (const [area, ground] of AREAS) {
      for (const stage of STAGES) {
        const ctx = draw((pen) => drawStage(pen, area, ground, stage, THEME));
        const name = `${stage} ${area.w}x${area.h}`;
        expect(ctx.depth, name).toBe(0);
        const clip = ctx.calls.findIndex((call) => call.op === "clip");
        expect(clip, name).toBeGreaterThan(-1);
        expect(ctx.calls[clip - 1], name).toMatchObject({ op: "rect", points: [[area.x, area.y], [area.x + area.w, area.y + area.h]] });
        expect(ctx.calls.length, name).toBeGreaterThan(20);
      }
    }
  });

  it("fade into the page at the top and the bottom", () => {
    const ctx = draw((pen) => drawStage(pen, AREAS[0][0], AREAS[0][1], "shelf", THEME));
    const fades = ctx.calls.filter((call) => call.op === "set" && call.name === "fillStyle" && call.value === THEME.ui.page);
    expect(fades.length).toBeGreaterThanOrEqual(1);
  });

  it("draw a small picture of each stage inside a card", () => {
    for (const stage of STAGES) {
      const ctx = draw((pen) => drawStageIcon(pen, stage, { x: 20, y: 30, w: 100, h: 100 }, THEME));
      expect(ctx.depth, stage).toBe(0);
      const clipped = ctx.calls.slice(ctx.calls.findIndex((call) => call.op === "clip"));
      const area = bounds(painted({ calls: clipped.filter((call) => call.op === "fillRect") }));
      expect(area.left, stage).toBeGreaterThanOrEqual(20);
      expect(area.right, stage).toBeLessThanOrEqual(120);
    }
  });
});
