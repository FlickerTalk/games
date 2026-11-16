import { describe, expect, it } from "vitest";
import { bounds, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { SUBS, drawSub } from "../src/subs.js";
import { THEME } from "../src/theme.js";

const art = THEME.art;
const sub = (options = {}) => draw((ctx) => drawSub(ctx, 100, 200, 80, art, options));

describe("the toy submarines", () => {
  it("are five with their own silhouettes, one a wrapped gift", () => {
    expect(SUBS.map((one) => one.id)).toEqual(["classic", "bathysphere", "whale", "bath", "longfin"]);
    expect(new Set(SUBS.map((one) => shapes(sub({ variant: one.id, idle: false })).join("|"))).size).toBe(5);
  });

  it("show the paint cannon at the surface, sink out of reach with bubbles when they dive, and launch a torpedo", () => {
    const up = sub({ idle: false });
    const down = sub({ idle: false, state: "underwater", time: 0.5 });
    expect(bounds(painted(down)).bottom).toBeGreaterThan(bounds(painted(up)).bottom + 30);
    expect(down.calls.some((call) => call.op === "set" && call.name === "globalAlpha" && call.value < 1)).toBe(true);
    expect(shapes(sub({ idle: false, state: "torpedo" }))).not.toEqual(shapes(down));
    expect(sub({ state: "surfacing", progress: 0.5, idle: false }).calls.length).toBeGreaterThan(up.calls.length);
    for (const { id } of SUBS) expect(sub({ variant: id }).depth, id).toBe(0);
  });
});
