import { describe, expect, it } from "vitest";
import { FLICK, PROFILES } from "../../src/avatars/cast.js";
import { drawEmblem } from "../../src/avatars/emblems.js";
import { draw, shapes } from "../canvas/recorder.js";

const EMBLEMS = [...PROFILES.map((one) => one.emblem), FLICK.emblem];

const reach = (call) => (call.radius ? Math.hypot(...call.points[0]) + call.radius : Math.max(...call.points.map(([x, y]) => Math.hypot(x, y))));

describe("the emblems", () => {
  it("draw thirteen different shapes, one for each profile and Flick's bolt", () => {
    const drawn = EMBLEMS.map((emblem) => JSON.stringify(shapes(draw((ctx) => drawEmblem(ctx, emblem)))));
    expect(new Set(drawn).size).toBe(13);
    for (const [at, emblem] of EMBLEMS.entries()) expect(JSON.parse(drawn[at]).length, emblem).toBeGreaterThan(3);
  });

  it("stay within fifteen units of where they are put", () => {
    for (const emblem of EMBLEMS) {
      for (const call of draw((ctx) => drawEmblem(ctx, emblem)).calls.filter((one) => one.points.length)) {
        expect(reach(call), emblem).toBeLessThanOrEqual(15);
      }
    }
  });

  it("draw nothing for a name they do not know", () => {
    for (const unknown of [undefined, "star", "constructor", "__proto__"]) expect(draw((ctx) => drawEmblem(ctx, unknown)).calls, String(unknown)).toEqual([]);
  });
});
