import { describe, expect, it } from "vitest";
import { bounds, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { ENGINES, POSES, drawEngine } from "../src/engine-art.js";
import { THEME } from "../src/theme.js";

const ME = { who: "ari", hair: "bob", hairColour: "ink" };
const engine = (kind, options = {}, size = 100) => draw((ctx) => drawEngine(ctx, 300, 300, size, kind, { pose: "idle", time: 0.2, pilot: ME, ...options }, THEME));
const lines = (ctx) => shapes(ctx).join("\n");

describe("an engine", () => {
  it("comes in the six approved shapes", () => {
    expect(ENGINES).toEqual(["steam", "rocket", "caterpillar", "teapot", "whale", "dragon"]);
    expect(new Set(ENGINES.map((kind) => lines(engine(kind)))).size).toBe(6);
  });

  it("stays near its place on the track in every pose, puffs included, and leaves the drawing state as it found it", () => {
    for (const size of [36, 100, 118]) {
      for (const kind of ENGINES) {
        for (const pose of POSES) {
          const ctx = engine(kind, { pose, time: 0.37 }, size);
          const box = bounds(painted(ctx));
          expect(box.left, `${kind} ${pose}`).toBeGreaterThan(300 - size * 0.85);
          expect(box.right, `${kind} ${pose}`).toBeLessThan(300 + size * 0.7);
          expect(box.top, `${kind} ${pose}`).toBeGreaterThan(300 - size * 1.05);
          expect(box.bottom, `${kind} ${pose}`).toBeLessThan(300 + size * 0.5);
          expect(ctx.depth).toBe(0);
        }
      }
    }
  });

  it("idles, puffs and dances differently", () => {
    expect(POSES).toEqual(["idle", "puffing", "dancing"]);
    for (const kind of ENGINES) expect(new Set(POSES.map((pose) => lines(engine(kind, { pose })))).size, kind).toBe(3);
  });

  it("carries whoever drives it at its round window, a kit face clipped to the glass", () => {
    for (const kind of ENGINES) {
      const mine = engine(kind);
      expect(mine.calls.filter((call) => call.op === "clip"), kind).toHaveLength(1);
      expect(lines(engine(kind, { pilot: { who: "flick" } })), kind).not.toBe(lines(mine));
      expect(engine(kind, { pilot: null }).calls.filter((call) => call.op === "clip"), kind).toHaveLength(0);
    }
  });

  it("shows 18 px or more of the driver through the window on a phone", () => {
    for (const kind of ENGINES) {
      const ctx = engine(kind, {}, 60);
      const at = ctx.calls.findIndex((call) => call.op === "clip");
      const face = ctx.calls.slice(0, at).reverse().find((call) => call.op === "arc");
      expect(face.radius * 2, kind).toBeGreaterThanOrEqual(18);
    }
  });
});
