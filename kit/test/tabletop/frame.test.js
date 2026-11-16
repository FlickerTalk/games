import { describe, expect, it } from "vitest";
import { boardFrame, drawBoardFrame, drawPieceShadow } from "../../src/tabletop/frame.js";
import { bounds, draw, painted } from "../canvas/recorder.js";

const ART = { wood: "#79503B", ink: "#243247" };

describe("the board's frame", () => {
  it("holds a square board with its base and outline inside the canvas, at any size", () => {
    for (const size of [120, 214, 320, 352, 720]) {
      const frame = boardFrame(size);
      const reach = (frame.line + 3) / 2;
      expect(frame.outer.w).toBe(frame.outer.h);
      expect(frame.outer.x - reach).toBeGreaterThanOrEqual(-0.01);
      expect(frame.outer.y - reach).toBeGreaterThanOrEqual(-0.01);
      expect(frame.outer.x + frame.outer.w + reach).toBeLessThanOrEqual(size + 0.01);
      expect(frame.outer.y + frame.outer.h + frame.depth + reach).toBeLessThanOrEqual(size + 0.01);
      expect(frame.inner.w).toBe(frame.inner.h);
      expect(frame.inner.x - frame.outer.x).toBeGreaterThanOrEqual(4);
      expect(frame.inner.x + frame.inner.w).toBeLessThan(frame.outer.x + frame.outer.w);
    }
  });

  it("takes the proportions a game gives it", () => {
    const thin = boardFrame(400, { padding: 0.01, depth: 0, radius: 0.02 });
    expect(thin.depth).toBe(0);
    expect(thin.inner.x - thin.outer.x).toBeCloseTo(Math.max(4, thin.outer.w * 0.01), 6);
    expect(thin.radius).toBeCloseTo(thin.outer.w * 0.02, 6);
  });

  it("draws the base under the frame, then the frame in its wood with the ink outline", () => {
    const frame = boardFrame(352);
    const ctx = draw((pen) => drawBoardFrame(pen, frame, ART));
    const fills = ctx.calls.filter((call) => call.op === "set" && call.name === "fillStyle").map((call) => call.value);
    expect(fills).toEqual([ART.ink, ART.wood]);
    const area = bounds(painted(ctx));
    expect(area.bottom).toBeCloseTo(frame.outer.y + frame.outer.h + frame.depth, 6);
    expect(area.top).toBeCloseTo(frame.outer.y, 6);
    expect(ctx.depth).toBe(0);
  });

  it("gives the board one light rim around its whole outline on a dark page, and none on a light one", () => {
    const frame = boardFrame(352);
    const strokes = (rim) =>
      draw((pen) => drawBoardFrame(pen, frame, { ...ART, rim }))
        .calls.filter((call) => call.op === "set" && call.name === "strokeStyle")
        .map((call) => call.value);
    expect(strokes(null)).not.toContain("#F5F5F5");
    expect(strokes("#F5F5F5").filter((colour) => colour === "#F5F5F5")).toHaveLength(1);
    const rimmed = draw((pen) => drawBoardFrame(pen, frame, { ...ART, rim: "#F5F5F5" }));
    const area = bounds(painted(rimmed));
    expect(area.bottom).toBeCloseTo(frame.outer.y + frame.outer.h + frame.depth, 6);
  });
});

describe("a piece's shadow", () => {
  it("lies just under the piece, and grows fainter and further as the piece is lifted", () => {
    const alphaOf = (ctx) => ctx.calls.filter((call) => call.op === "set" && call.name === "globalAlpha").at(-1).value;
    const resting = draw((pen) => drawPieceShadow(pen, 100, 100, 20, { colour: ART.ink }));
    const lifted = draw((pen) => drawPieceShadow(pen, 100, 100, 20, { colour: ART.ink, lift: 16 }));
    const [still, up] = [resting, lifted].map((ctx) => ctx.calls.find((call) => call.op === "ellipse"));
    expect(still.points[0][1]).toBeGreaterThan(100);
    expect(up.points[0][1]).toBeGreaterThan(still.points[0][1]);
    expect(up.rx).toBeGreaterThan(still.rx);
    expect(alphaOf(lifted)).toBeLessThan(alphaOf(resting));
    expect(resting.depth).toBe(0);
  });
});
