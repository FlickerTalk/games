import { describe, expect, it } from "vitest";
import { bounds, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { TARGET_KINDS, drawTarget } from "../src/targets.js";
import { THEME } from "../src/theme.js";
import { TARGET_GROUPS } from "../src/world.js";

const art = THEME.art;
const target = (kind, hit = 0, time = 0.4) => draw((ctx) => drawTarget(ctx, 100, 100, 56, kind, art, { hit, time, colour: art.player }));

describe("the things to shoot at", () => {
  it("draw every kind the battlefields lay, each its own shape, none alive", () => {
    const laid = new Set(Object.values(TARGET_GROUPS).flat());
    expect([...laid].every((kind) => TARGET_KINDS.includes(kind))).toBe(true);
    expect(TARGET_KINDS).toHaveLength(23);
    expect(new Set(TARGET_KINDS.map((kind) => shapes(target(kind, 0, 0)).join("|"))).size).toBe(23);
  });

  it("stay around the point and size they are given and leave the context as they found it", () => {
    for (const kind of TARGET_KINDS) {
      const ctx = target(kind);
      const box = bounds(painted(ctx));
      expect(ctx.depth, kind).toBe(0);
      expect(box.left, kind).toBeGreaterThan(100 - 56);
      expect(box.right, kind).toBeLessThan(100 + 56);
      expect(box.bottom, kind).toBeLessThan(100 + 56);
    }
  });

  it("answer a hit: something tumbles, spins, rings, opens or pops", () => {
    for (const kind of TARGET_KINDS) expect(shapes(target(kind, 0.6)), kind).not.toEqual(shapes(target(kind, 0)));
  });

  it("draw nothing for a kind they do not know", () => {
    expect(target("dragon").calls.filter((call) => call.op !== "save" && call.op !== "restore")).toEqual([]);
  });
});
